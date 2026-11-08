/**
 * Smoke checks for cinema CDL grades (no test runner required).
 * Run: node tests/cinemaGrades.test.js
 */
import {
  GRADE_IDS,
  gradeFromId,
  gradePromptClause,
} from "../packages/studio/src/lib/cinemaGrades.js";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

const EXPECTED = [
  "neutral-print",
  "daylight-balanced",
  "warm-tungsten",
  "cool-moonlight",
  "golden-hour-print",
  "bleach-bypass-mild",
];

assert(GRADE_IDS.length === 6, "exactly six grades");
assert(GRADE_IDS.join(",") === EXPECTED.join(","), "grade id order");

for (const id of EXPECTED) {
  const g = gradeFromId(id);
  assert(g != null, `gradeFromId(${id}) returns object`);
  assert(g.look === id, `look matches id for ${id}`);
  assert(
    Array.isArray(g.slope) &&
      g.slope.length === 3 &&
      Array.isArray(g.offset) &&
      g.offset.length === 3 &&
      Array.isArray(g.power) &&
      g.power.length === 3 &&
      typeof g.sat === "number",
    `CDL shape for ${id}`,
  );
}

assert(gradeFromId(null) === null, "gradeFromId(null) → null");
assert(gradeFromId("") === null, "gradeFromId('') → null");
assert(gradeFromId("unknown-look") === null, "gradeFromId unknown → null");

assert(gradePromptClause("neutral-print") === null, "neutral-print clause null");
assert(gradePromptClause("") === null, "empty clause null");
assert(gradePromptClause(null) === null, "null clause null");
assert(gradePromptClause("no-such-grade") === null, "unknown clause null");

for (const id of EXPECTED) {
  if (id === "neutral-print") continue;
  const clause = gradePromptClause(id);
  assert(typeof clause === "string" && clause.length > 0, `clause for ${id}`);
  assert(!/\d/.test(clause), `clause for ${id} has no digits`);
  assert(
    !/slope|offset|power|sat\b/i.test(clause),
    `clause for ${id} has no CDL field names`,
  );
}

const neutral = gradeFromId("neutral-print");
assert(
  neutral.slope.every((v) => v === 1) &&
    neutral.offset.every((v) => v === 0) &&
    neutral.power.every((v) => v === 1) &&
    neutral.sat === 1,
  "neutral-print is identity CDL",
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nall cinemaGrades checks passed");
