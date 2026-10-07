// Generates TypeScript types from contracts/schemas into src/shared/contracts.
// Run after any contract change: npm run contracts:types
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const here = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(here, "../../contracts/schemas");
const outDir = join(here, "../src/shared/contracts");
const domains = ["common", "world", "lobby", "metadata", "signaling", "gameplay"];

mkdirSync(outDir, { recursive: true });
for (const domain of domains) {
  const schema = JSON.parse(readFileSync(join(schemasDir, `${domain}.schema.json`), "utf8"));
  // Without $id, cross-file refs such as common.schema.json#/$defs/Vec2 resolve against schemasDir.
  // Without title, the root type is named after the domain.
  delete schema.$id;
  delete schema.title;
  // List every $def as a property of a root object so each one becomes a named export.
  const root = {
    ...schema,
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      Object.keys(schema.$defs).map((name) => [name, { $ref: `#/$defs/${name}` }]),
    ),
  };
  const ts = await compile(root, `${domain}-schema-root`, {
    cwd: schemasDir,
    bannerComment: `// Generated from contracts/schemas/${domain}.schema.json by scripts/generate-contract-types.mjs. Do not edit.`,
    additionalProperties: false,
    ignoreMinAndMaxItems: true,
    style: { printWidth: 100 },
  });
  writeFileSync(join(outDir, `${domain}.ts`), ts);
}
console.log(`Generated ${domains.length} files in src/shared/contracts`);
