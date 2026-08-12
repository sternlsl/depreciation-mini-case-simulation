const FACTS = Object.freeze({
  assetCost: 100,
  annualRevenue: 80,
  otherCosts: 35,
});

const OUTCOME_KEYS = Object.freeze(["fired", "safe", "bonus", "press", "audit"]);

function depreciationForYear(policy, year, beginningBookValue) {
  const depreciableCost = FACTS.assetCost - policy.residualValue;

  if (year > policy.usefulLife) {
    return 0;
  }

  if (policy.method === "straight") {
    return depreciableCost / policy.usefulLife;
  }

  if (year === policy.usefulLife) {
    return Math.max(0, beginningBookValue - policy.residualValue);
  }

  return beginningBookValue * (2 / policy.usefulLife);
}

function calculateSchedule(policy, years = Math.max(5, policy.usefulLife)) {
  const schedule = [];
  let bookValue = FACTS.assetCost;

  for (let year = 1; year <= years; year += 1) {
    const depreciation = Math.min(
      depreciationForYear(policy, year, bookValue),
      Math.max(0, bookValue - policy.residualValue)
    );
    bookValue = Math.max(policy.residualValue, bookValue - depreciation);
    schedule.push({
      year,
      depreciation,
      bookValue,
      netIncome: FACTS.annualRevenue - FACTS.otherCosts - depreciation,
    });
  }

  return schedule;
}

function residualWarning(policy) {
  const acceptableResidualValue = policy.usefulLife < 5 ? 20 : 10;

  if (policy.residualValue <= acceptableResidualValue) {
    return null;
  }

  if (policy.usefulLife >= 6) {
    return policy.residualValue >= 25 || policy.usefulLife >= 7 ? "urgent" : "warning";
  }

  return policy.residualValue >= 25 ? "urgent" : "warning";
}

function usefulLifeWarning(policy) {
  if (policy.usefulLife >= 7) {
    return "urgent";
  }

  return policy.usefulLife === 6 ? "warning" : null;
}

function calculateOutcome(policy) {
  const schedule = calculateSchedule(policy);
  const shortTermIncome = schedule[0].netIncome + schedule[1].netIncome;
  const warnings = [usefulLifeWarning(policy), residualWarning(policy)].filter(Boolean);

  if (warnings.includes("urgent")) {
    return { outcomeKey: "audit", shortTermIncome };
  }

  if (warnings.length >= 2) {
    return { outcomeKey: "press", shortTermIncome };
  }

  if (shortTermIncome < 50) {
    return { outcomeKey: "fired", shortTermIncome };
  }

  if (shortTermIncome >= 60) {
    return { outcomeKey: "bonus", shortTermIncome };
  }

  return { outcomeKey: "safe", shortTermIncome };
}

function validatePolicy(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const policy = {
    method: value.method,
    usefulLife: Number(value.usefulLife),
    residualValue: Number(value.residualValue),
  };

  const validMethod = policy.method === "straight" || policy.method === "accelerated";
  const validLife = Number.isInteger(policy.usefulLife)
    && policy.usefulLife >= 1
    && policy.usefulLife <= 7;
  const validResidual = Number.isInteger(policy.residualValue)
    && policy.residualValue >= 0
    && policy.residualValue <= 30
    && policy.residualValue % 5 === 0;

  return validMethod && validLife && validResidual ? policy : null;
}

module.exports = {
  OUTCOME_KEYS,
  calculateOutcome,
  calculateSchedule,
  validatePolicy,
};
