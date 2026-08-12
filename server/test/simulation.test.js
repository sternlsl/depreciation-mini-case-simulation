const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateOutcome, calculateSchedule, validatePolicy } = require("../src/simulation");

test("straight-line depreciation produces the expected schedule", () => {
  const schedule = calculateSchedule({ method: "straight", usefulLife: 5, residualValue: 10 });
  assert.equal(schedule[0].depreciation, 18);
  assert.equal(schedule[0].netIncome, 27);
  assert.equal(schedule[4].bookValue, 10);
});

test("double-declining depreciation is capped at residual value", () => {
  const schedule = calculateSchedule({ method: "accelerated", usefulLife: 7, residualValue: 0 }, 7);
  assert.equal(Math.round(schedule.reduce((total, row) => total + row.depreciation, 0)), 100);
  assert.equal(schedule[6].bookValue, 0);
});

test("all five endings are reproducible from policy inputs", () => {
  assert.equal(calculateOutcome({ method: "straight", usefulLife: 1, residualValue: 0 }).outcomeKey, "fired");
  assert.equal(calculateOutcome({ method: "straight", usefulLife: 5, residualValue: 10 }).outcomeKey, "safe");
  assert.equal(calculateOutcome({ method: "straight", usefulLife: 6, residualValue: 10 }).outcomeKey, "bonus");
  assert.equal(calculateOutcome({ method: "straight", usefulLife: 6, residualValue: 15 }).outcomeKey, "press");
  assert.equal(calculateOutcome({ method: "straight", usefulLife: 7, residualValue: 0 }).outcomeKey, "audit");
});

test("policy validation rejects values outside the game controls", () => {
  assert.deepEqual(
    validatePolicy({ method: "straight", usefulLife: 3, residualValue: 5 }),
    { method: "straight", usefulLife: 3, residualValue: 5 }
  );
  assert.equal(validatePolicy({ method: "other", usefulLife: 3, residualValue: 5 }), null);
  assert.equal(validatePolicy({ method: "straight", usefulLife: 8, residualValue: 5 }), null);
  assert.equal(validatePolicy({ method: "straight", usefulLife: 3, residualValue: 6 }), null);
});
