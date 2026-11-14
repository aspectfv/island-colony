// Links rules to tests. Reads every table with a Rule ID column in docs/, then scans the repository's
// tracked files for rule IDs.
//   - An ID cited anywhere outside docs/ that no table defines fails the check.
//   - A rule that no test file cites is listed as not built. With --strict it fails the check.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const contractsDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(contractsDir, "docs");
const strict = process.argv.includes("--strict");

const ID_FORMAT = /^[A-Z]+(-[A-Z]+)*-\d{2}$/;
const TEST_FILE =
  /(\.test\.|\.spec\.|_test\.go$|(^|\/)test_[^/]*\.py$|Tests?\.(java|cs)$|(^|\/)(tests?|e2e)\/)/;

const failures = [];
const rules = new Map();

for (const file of readdirSync(docsDir).filter((f) => f.endsWith(".md")).sort()) {
  let idColumn = -1;
  readFileSync(join(docsDir, file), "utf8")
    .split("\n")
    .forEach((line, index) => {
      if (!line.startsWith("|")) {
        idColumn = -1;
        return;
      }
      const cells = line.slice(1, line.lastIndexOf("|")).split("|").map((cell) => cell.trim());
      if (idColumn === -1) {
        idColumn = cells.indexOf("Rule ID");
        if (idColumn === -1) idColumn = -2;
        return;
      }
      if (idColumn < 0 || cells.every((cell) => /^:?-+:?$/.test(cell))) return;
      const id = cells[idColumn];
      const where = `docs/${file}:${index + 1}`;
      if (!ID_FORMAT.test(id)) {
        failures.push(`${where}: "${id}" is not a rule ID like GP-GATHER-01`);
      } else if (rules.has(id)) {
        failures.push(`${where}: ${id} is already defined in ${rules.get(id).where}`);
      } else {
        rules.set(id, { where, tests: [] });
      }
    });
}

const prefixes = [...new Set([...rules.keys()].map((id) => id.split("-")[0]))];
const citation = new RegExp(`\\b(?:${prefixes.join("|")})(?:-[A-Z]+)*-\\d{2}\\b`, "g");
const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: contractsDir, encoding: "utf8" }).trim();
const files = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
  .split("\n")
  .filter((path) => path && !path.endsWith(".md") && !path.startsWith("contracts/docs/"));

for (const path of files) {
  const text = readFileSync(join(repoRoot, path), "utf8");
  if (text.includes("\0")) continue;
  text.split("\n").forEach((line, index) => {
    for (const [id] of line.matchAll(citation)) {
      const rule = rules.get(id);
      if (!rule) failures.push(`${path}:${index + 1}: ${id} is not defined in any rule table`);
      else if (TEST_FILE.test(path)) rule.tests.push(`${path}:${index + 1}`);
    }
  });
}

const untested = [...rules].filter(([, rule]) => rule.tests.length === 0);
console.log(`${rules.size} rules, ${rules.size - untested.length} tested, ${untested.length} not built`);
if (untested.length > 0) {
  console.log("\nNot built:");
  untested.forEach(([id, rule]) => console.log(`  ${id}  ${rule.where}`));
  if (strict) failures.push(`${untested.length} rules have no test (--strict)`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  failures.forEach((failure) => console.error(`  ${failure}`));
  process.exit(1);
}
