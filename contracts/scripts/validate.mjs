// Validates every example against its schema, checks that every message type has an example,
// and runs semantic checks on world configs that JSON Schema cannot express.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const domains = ["common", "world", "lobby", "metadata", "signaling", "gameplay"];

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
const schemas = Object.fromEntries(
  domains.map((domain) => [domain, readJson(join(root, "schemas", `${domain}.schema.json`))]),
);
Object.values(schemas).forEach((schema) => ajv.addSchema(schema));

const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);

const examples = [];
for (const domain of domains) {
  for (const file of readdirSync(join(root, "examples", domain)).filter((f) => f.endsWith(".json"))) {
    const def = file.split(".")[0];
    const where = `examples/${domain}/${file}`;
    const data = readJson(join(root, "examples", domain, file));
    examples.push({ domain, def, where, data });
    if (!schemas[domain].$defs[def]) {
      fail(where, `no $defs/${def} in schemas/${domain}.schema.json`);
      continue;
    }
    const validate = ajv.getSchema(`${schemas[domain].$id}#/$defs/${def}`);
    if (!validate(data)) {
      validate.errors.forEach((e) => fail(where, `${e.instancePath || "/"} ${e.message} ${JSON.stringify(e.params)}`));
    }
  }
}

for (const domain of ["signaling", "gameplay"]) {
  for (const [def, schema] of Object.entries(schemas[domain].$defs)) {
    if (schema.properties?.type?.const && !examples.some((e) => e.domain === domain && e.def === def)) {
      fail(`schemas/${domain}.schema.json`, `message ${def} has no example`);
    }
  }
}

// Reference terrain sampler. Clients and services must produce the same heights.
export function sampleHeight(island, x, z) {
  const { size, resolution, heights } = island;
  const cell = size / (resolution - 1);
  const clamp = (v) => Math.min(Math.max(v, 0), resolution - 1);
  const fx = clamp((x + size / 2) / cell);
  const fz = clamp((z + size / 2) / cell);
  const c0 = Math.min(Math.floor(fx), resolution - 2);
  const r0 = Math.min(Math.floor(fz), resolution - 2);
  const tx = fx - c0;
  const tz = fz - r0;
  const h = (r, c) => heights[r * resolution + c];
  const top = h(r0, c0) * (1 - tx) + h(r0, c0 + 1) * tx;
  const bottom = h(r0 + 1, c0) * (1 - tx) + h(r0 + 1, c0 + 1) * tx;
  return top * (1 - tz) + bottom * tz;
}

function checkWorld(where, world) {
  const { island, rules } = world;
  const onLand = (p) => sampleHeight(island, p.x, p.z) > island.waterLevel;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const unique = (items, key, label) => {
    const seen = new Set();
    items.forEach((item) => (seen.has(item[key]) ? fail(where, `duplicate ${label} ${item[key]}`) : seen.add(item[key])));
    return seen;
  };

  if (island.heights.length !== island.resolution ** 2) {
    fail(where, `heights has ${island.heights.length} values, expected ${island.resolution ** 2}`);
    return;
  }
  const resources = unique(rules.resources, "resourceType", "resourceType");
  const nodeTypes = unique(rules.nodeTypes, "nodeType", "nodeType");
  const structures = unique(rules.structures, "structureType", "structureType");
  unique(rules.objectives, "objectiveId", "objectiveId");
  unique(world.buildZones, "zoneId", "zoneId");
  unique(world.resourceNodes, "resourceId", "resourceId");

  const checkAmounts = (label, amounts) =>
    Object.keys(amounts).forEach((r) => resources.has(r) || fail(where, `${label} uses unknown resource ${r}`));
  checkAmounts("startingResources", rules.startingResources);
  rules.nodeTypes.forEach((n) => resources.has(n.resourceType) || fail(where, `node type ${n.nodeType} yields unknown resource ${n.resourceType}`));
  rules.structures.forEach((s) => checkAmounts(`structure ${s.structureType} cost`, s.cost));
  rules.objectives.forEach((o) => {
    if (o.kind === "GATHER") checkAmounts(`objective ${o.objectiveId} target`, o.target);
    if (o.kind === "BUILD" && !structures.has(o.structureType)) fail(where, `objective ${o.objectiveId} builds unknown structure ${o.structureType}`);
  });

  world.spawnPoints.forEach((s, slot) => onLand(s.position) || fail(where, `spawn point ${slot} is in water`));
  world.buildZones.forEach((zone) => onLand(zone.center) || fail(where, `${zone.zoneId} center is in water`));

  const footprint = Object.fromEntries(rules.nodeTypes.map((n) => [n.nodeType, n.footprintRadius]));
  for (const node of world.resourceNodes) {
    if (!nodeTypes.has(node.nodeType)) fail(where, `${node.resourceId} has unknown node type ${node.nodeType}`);
    if (!onLand(node.position)) fail(where, `${node.resourceId} is in water`);
    const expectedY = sampleHeight(island, node.position.x, node.position.z);
    if (Math.abs(node.position.y - expectedY) > 0.05) fail(where, `${node.resourceId} y ${node.position.y} differs from terrain ${expectedY.toFixed(2)}`);
    for (const zone of world.buildZones) {
      if (distance(node.position, zone.center) < zone.radius + (footprint[node.nodeType] ?? 0)) {
        fail(where, `${node.resourceId} blocks ${zone.zoneId}`);
      }
    }
  }
}

function checkSummary(where, summary) {
  const placed = summary.contributions.reduce((sum, c) => sum + c.structuresPlaced, 0);
  if (placed !== summary.structures.length) {
    fail(where, `contributions place ${placed} structures, structures lists ${summary.structures.length}`);
  }
  const totals = {};
  summary.contributions.forEach((c) => Object.entries(c.gathered).forEach(([r, n]) => (totals[r] = (totals[r] ?? 0) + n)));
  const keys = new Set([...Object.keys(totals), ...Object.keys(summary.totalGathered)]);
  keys.forEach((r) => (totals[r] ?? 0) === (summary.totalGathered[r] ?? 0) || fail(where, `contributions gather ${totals[r] ?? 0} ${r}, totalGathered says ${summary.totalGathered[r] ?? 0}`));
}

for (const { def, where, data } of examples) {
  if (def === "WorldConfig") checkWorld(where, data);
  if (def === "SessionDetails") checkWorld(`${where} worldConfig`, data.worldConfig);
  if (def === "SessionSummary") checkSummary(where, data);
  if (def === "SessionCompleted" || def === "SessionEnded") checkSummary(where, data.summary);
  if (def === "SessionRecord" && data.summary) checkSummary(where, data.summary);
}

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} problem(s) in ${examples.length} examples`);
  process.exit(1);
}
console.log(`${examples.length} examples valid`);
