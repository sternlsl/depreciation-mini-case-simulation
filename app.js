const facts = {
  companyName: "Aster Compute Systems",
  equipmentName: "AI accelerator server racks",
  assetCost: 100,
  annualRevenue: 80,
  otherCosts: 35,
};

const performanceTargets = {
  dangerShortTermIncome: 50,
  bonusShortTermIncome: 60,
};

const appConfig = window.DEPRECIATION_CONFIG || {};
const apiBaseUrl = String(appConfig.apiBaseUrl || "").replace(/\/$/, "");
const endingContent = window.DEPRECIATION_ENDINGS || {};
const endingLabels = {
  fired: "You got fired",
  safe: "You kept your job",
  bonus: "You were given a bonus",
  press: "Accounting controversy",
  audit: "Audit failure",
};
const endingKeys = Object.keys(endingLabels);

const reasonablePolicy = {
  method: "straight",
  usefulLife: 5,
  residualValue: 10,
};

const scenario = {
  title: "Short-term earnings focus",
  description:
    `Aster Compute Systems' board is using combined Years 1-2 net income to evaluate performance: $60M or more makes a CEO bonus likely, while less than $50M puts the CEO at risk.`,
};

const cfoPrompts = [
  {
    key: "method",
    step: "Decision 1 of 3",
    title: "Which depreciation method should we use?",
    text:
      "Straight-line makes depreciation expense even. Double-declining balance records more expense earlier and less later.",
  },
  {
    key: "life",
    step: "Decision 2 of 3",
    title: "How long will the AI accelerator racks be useful?",
    text:
      "I chose 3 years as a starting point, which is the industry standard for this type of equipment. Make an adjustment if you think we would be able to justify it.",
  },
  {
    key: "residual",
    step: "Decision 3 of 3",
    title: "What will the racks be worth at the end?",
    text:
      "A $0 residual value is the norm here. If we increase it, it means we think we can sell the server racks when their useful life ends.",
  },
  {
    key: "review",
    step: "Review",
    title: "Review the full depreciation policy.",
    text:
      "You have considered each assumption one at a time. Now you can adjust all three before approving the final policy.",
  },
];

const tutorialSteps = {
  background: {
    title: "Key performance indicators",
    text:
      "Aster Compute Systems just purchased AI accelerator server racks. Review our numbers before jumping into the depreciation decisions.",
    button: "Next",
  },
  decision: {
    title: "Decision area",
    text: "This is where we will make each depreciation decision before approving the policy.",
    button: "Next",
  },
  cfo: {
    title: "WorkChat",
    text: "Your CFO will send context and ask for each decision here.",
    button: "Got it",
  },
};

let state = {
  started: false,
  activeStep: 0,
  approved: false,
  reviewRequested: false,
  tutorialStep: null,
  dashboardOpen: false,
  chatStage: "opening",
  tourSkipped: false,
  replayMode: false,
  previewTab: "charts",
  method: null,
  usefulLife: 3,
  residualValue: 0,
  runId: createRunId(),
  completionStatus: "idle",
  endingProgress: null,
};

let previousChatMessageCount = 0;
let studentName = "";
let authState = {
  credential: null,
  email: "",
  status: "loading",
};

function createRunId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const els = {
  landingScreen: document.querySelector("#landingScreen"),
  simulationScreen: document.querySelector("#simulationScreen"),
  startSimulationButton: document.querySelector("#startSimulationButton"),
  studentNameInput: document.querySelector("#studentNameInput"),
  googleSignInButton: document.querySelector("#googleSignInButton"),
  signInStatus: document.querySelector("#signInStatus"),
  decisionHeading: document.querySelector("#decisionHeading"),
  cfoCard: document.querySelector("#cfoCard"),
  chatThread: document.querySelector("#chatThread"),
  startTip: document.querySelector("#startTip"),
  tutorialTitle: document.querySelector("#tutorialTitle"),
  tutorialText: document.querySelector("#tutorialText"),
  tutorialBackdrop: document.querySelector("#tutorialBackdrop"),
  dismissTipButton: document.querySelector("#dismissTipButton"),
  introPanel: document.querySelector(".intro"),
  backgroundInfo: document.querySelector(".intro"),
  decisionPanel: document.querySelector(".decision-panel"),
  controlsGrid: document.querySelector(".controls-grid"),
  methodCard: document.querySelector('[data-control="method"]'),
  nextButton: document.querySelector("#nextButton"),
  resetButton: document.querySelector("#resetButton"),
  methodButtons: [...document.querySelectorAll("[data-method]")],
  controls: [...document.querySelectorAll(".control-card")],
  lifeInput: document.querySelector("#lifeInput"),
  lifeOutput: document.querySelector("#lifeOutput"),
  residualInput: document.querySelector("#residualInput"),
  residualOutput: document.querySelector("#residualOutput"),
  previewPanel: document.querySelector(".preview-panel"),
  incomeTargetPanel: document.querySelector("#incomeTargetPanel"),
  incomeTargetChips: document.querySelector("#incomeTargetChips"),
  incomeChartTitle: document.querySelector("#incomeChartTitle"),
  incomeChart: document.querySelector("#incomeChart"),
  previewTabs: [...document.querySelectorAll("[data-preview-tab]")],
  previewViews: [...document.querySelectorAll("[data-preview-view]")],
  incomeStatementBody: document.querySelector("#incomeStatementBody"),
  balanceSheetBody: document.querySelector("#balanceSheetBody"),
  finalPanel: document.querySelector("#finalPanel"),
  finalTitle: document.querySelector("#finalTitle"),
  finalText: document.querySelector("#finalText"),
  outcomeDetails: document.querySelector("#outcomeDetails"),
  endingProgress: document.querySelector("#endingProgress"),
  endingProgressStatus: document.querySelector("#endingProgressStatus"),
  endingGrid: document.querySelector("#endingGrid"),
  endingCollectionCount: document.querySelector("#endingCollectionCount"),
  playAgainButton: document.querySelector("#playAgainButton"),
};

function money(value) {
  const rounded = Math.round(value);
  return rounded < 0 ? `-$${Math.abs(rounded)}M` : `$${rounded}M`;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getTutorialTarget() {
  if (state.tutorialStep === "background") {
    return els.backgroundInfo;
  }

  if (state.tutorialStep === "decision") {
    return els.decisionPanel;
  }

  return els.cfoCard;
}

function updateTutorialFocus(showTutorial) {
  els.introPanel.classList.toggle(
    "is-tutorial-focus",
    showTutorial && state.tutorialStep === "background"
  );
  els.decisionPanel.classList.toggle("is-tutorial-focus", showTutorial && state.tutorialStep === "decision");
  els.cfoCard.classList.toggle("is-tutorial-focus", showTutorial && state.tutorialStep === "cfo");
}

function positionStartTip() {
  const target = getTutorialTarget();
  const cardRect = target.getBoundingClientRect();
  const margin = 16;
  const gap = 12;
  const tipWidth = els.startTip.offsetWidth || 320;
  const tipHeight = els.startTip.offsetHeight || 120;
  let top = cardRect.top + 8;
  let left = cardRect.right + gap;
  let below = false;

  if (state.tutorialStep === "decision") {
    top = cardRect.top + 48;
    left = Math.min(
      window.innerWidth - tipWidth - margin,
      Math.max(margin, cardRect.left + 24)
    );
  } else if (left + tipWidth > window.innerWidth - margin) {
    below = true;
    left = Math.min(window.innerWidth - tipWidth - margin, Math.max(margin, cardRect.left));
    top = cardRect.bottom + gap;
  }

  if (top + tipHeight > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - tipHeight - margin);
  }

  els.startTip.style.left = `${left}px`;
  els.startTip.style.top = `${top}px`;
  els.startTip.classList.toggle("is-below", below);
  els.startTip.classList.toggle("is-floating", state.tutorialStep === "decision");
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function depreciationForYear(policy, year, beginningBookValue = facts.assetCost) {
  const depreciableCost = facts.assetCost - policy.residualValue;

  if (year > policy.usefulLife) {
    return 0;
  }

  if (policy.method === "straight") {
    return depreciableCost / policy.usefulLife;
  }

  if (year === policy.usefulLife) {
    return Math.max(0, beginningBookValue - policy.residualValue);
  }

  const doubleDecliningRate = 2 / policy.usefulLife;
  return beginningBookValue * doubleDecliningRate;
}

function getIncomeHorizon(policy = state) {
  return Math.max(5, policy.usefulLife);
}

function calculateSchedule(policy = state, years = getIncomeHorizon(policy)) {
  const schedule = [];
  let bookValue = facts.assetCost;
  let accumulatedDepreciation = 0;

  for (let year = 1; year <= years; year += 1) {
    const depreciation = Math.min(
      depreciationForYear(policy, year, bookValue),
      Math.max(0, bookValue - policy.residualValue)
    );
    accumulatedDepreciation += depreciation;
    bookValue = Math.max(policy.residualValue, bookValue - depreciation);

    schedule.push({
      year,
      depreciation,
      accumulatedDepreciation,
      bookValue,
      revenue: facts.annualRevenue,
      netIncome: facts.annualRevenue - facts.otherCosts - depreciation,
    });
  }

  return schedule;
}

function getMetrics(schedule) {
  const netIncomes = schedule.map((row) => row.netIncome);

  return {
    yearOneIncome: schedule[0].netIncome,
    shortTermIncome: schedule[0].netIncome + schedule[1].netIncome,
    fiveYearIncome: sum(netIncomes),
    incomeRange: Math.max(...netIncomes) - Math.min(...netIncomes),
  };
}

function getPerformanceStatus(metrics) {
  if (!metrics) {
    return {
      key: "pending",
      label: "Choose a method to test performance.",
    };
  }

  if (metrics.shortTermIncome < performanceTargets.dangerShortTermIncome) {
    return {
      key: "danger",
      label: `${money(metrics.shortTermIncome)} in Years 1-2: CEO is in danger.`,
    };
  }

  if (metrics.shortTermIncome >= performanceTargets.bonusShortTermIncome) {
    return {
      key: "bonus",
      label: `${money(metrics.shortTermIncome)} in Years 1-2: bonus likely.`,
    };
  }

  return {
    key: "safe",
    label: `${money(metrics.shortTermIncome)} in Years 1-2: target cleared.`,
  };
}

function allPossiblePolicies() {
  const policies = [];

  ["straight", "accelerated"].forEach((method) => {
    for (let usefulLife = 1; usefulLife <= 7; usefulLife += 1) {
      for (let residualValue = 0; residualValue <= 30; residualValue += 5) {
        policies.push({ method, usefulLife, residualValue });
      }
    }
  });

  return policies;
}

function getBenchmark() {
  const policyMetrics = allPossiblePolicies().map((policy) => {
    const schedule = calculateSchedule(policy);
    const metrics = getMetrics(schedule);
    return { policy, metrics };
  });

  const bestShortTerm = Math.max(...policyMetrics.map((item) => item.metrics.shortTermIncome));

  return { bestShortTerm };
}

function getNetIncomeTooltip(row) {
  return `Year ${row.year} net income: ${money(row.revenue)} revenue - ${money(
    facts.otherCosts
  )} other operating costs - ${money(row.depreciation)} depreciation expense = ${money(
    row.netIncome
  )}.`;
}

function getDepreciationTooltip(row) {
  const methodText =
    state.method === "straight"
      ? `Straight-line: (${money(facts.assetCost)} cost - ${money(
          state.residualValue
        )} residual value) / ${state.usefulLife} years = ${money(row.depreciation)}.`
      : row.depreciation === 0
        ? `The asset has reached its residual value, so no additional depreciation is recorded in Year ${row.year}.`
        : `Double-declining: beginning book value x ${Math.round(
            (2 / state.usefulLife) * 100
          )}% rate, capped so ending book value does not fall below ${money(
            state.residualValue
          )} residual value = ${money(row.depreciation)}.`;

  return `Year ${row.year} depreciation expense. ${methodText}`;
}

function getSegmentLabel(label, value, height) {
  if (height < 16) {
    return "";
  }

  return `<span class="segment-label ${height < 38 ? "is-compact" : ""}"><strong>${money(
    value
  )}</strong></span>`;
}

function renderIncomeChart(schedule, metrics) {
  const maxExpenseValue = facts.otherCosts + facts.assetCost;
  const maxLossValue = Math.max(0, maxExpenseValue - facts.annualRevenue);
  const upperHeight = 205;
  const revenueHeight = 174;
  const revenueTop = upperHeight - revenueHeight;
  const largestDisplayedLoss = Math.max(0, ...schedule.map((row) => -row.netIncome));
  const hasLoss = largestDisplayedLoss > 0;
  const maximumLossPlotHeight = 48;
  const displayedLossPlotHeight = hasLoss
    ? Math.max(8, (largestDisplayedLoss / maxLossValue) * maximumLossPlotHeight)
    : 0;
  const lossZoneHeight = hasLoss ? displayedLossPlotHeight + 16 : 0;
  const trackHeight = upperHeight + lossZoneHeight;
  const revenueScale = revenueHeight / facts.annualRevenue;
  const depreciationCapacity = facts.annualRevenue - facts.otherCosts;
  const performanceStatus = getPerformanceStatus(metrics);
  els.incomeChart.style.setProperty("--year-count", schedule.length);
  els.incomeChart.style.setProperty("--track-height", `${trackHeight}px`);
  els.incomeChart.style.setProperty("--upper-height", `${upperHeight}px`);
  els.incomeChart.style.setProperty("--loss-zone-height", `${lossZoneHeight}px`);
  els.incomeChart.style.setProperty("--revenue-top", `${revenueTop}px`);

  els.incomeChart.innerHTML = schedule
    .map((row, index) => {
      const columnClasses = ["chart-column"];
      const operatingHeight = facts.otherCosts * revenueScale;
      const depreciationHeight = Math.min(row.depreciation, depreciationCapacity) * revenueScale;
      const incomeHeight = Math.max(0, row.netIncome) * revenueScale;
      const lossHeight = row.netIncome < 0
        ? Math.max(8, (-row.netIncome / maxLossValue) * maximumLossPlotHeight)
        : 0;
      const isLoss = row.netIncome < 0;

      if (row.year <= 2) {
        columnClasses.push("is-target-window", `is-${performanceStatus.key}`);
      }

      return `
        <div class="${columnClasses.join(" ")}">
          <div
            class="column-track ${isLoss ? "is-loss" : ""}"
            style="--operating-height: ${operatingHeight}px; --depreciation-height: ${depreciationHeight}px; --income-height: ${incomeHeight}px; --loss-height: ${lossHeight}px; --revenue-height: ${revenueHeight}px"
          >
            ${
              index === 0
                ? `<span class="revenue-line-label">Revenue ${money(row.revenue)}</span>`
                : ""
            }
            <div
              class="stack-segment operating-segment"
              title="Operating costs in Year ${row.year}: ${money(facts.otherCosts)}."
              aria-label="Operating costs in Year ${row.year}: ${money(facts.otherCosts)}."
            >${getSegmentLabel("Operating costs", facts.otherCosts, operatingHeight)}</div>
            <div
              class="stack-segment depreciation-segment"
              title="${escapeAttribute(getDepreciationTooltip(row))}"
              aria-label="${escapeAttribute(getDepreciationTooltip(row))}"
            >${getSegmentLabel("Depreciation", row.depreciation, depreciationHeight)}</div>
            ${
              isLoss
                ? ""
                : `<div class="stack-segment income-segment" title="${escapeAttribute(
                    getNetIncomeTooltip(row)
                  )}" aria-label="${escapeAttribute(getNetIncomeTooltip(row))}">${getSegmentLabel(
                    "Net income",
                    row.netIncome,
                    incomeHeight
                  )}</div>`
            }
            ${
              isLoss
                ? `<div class="depreciation-overflow-segment" title="Depreciation expense exceeds remaining revenue by ${money(
                    -row.netIncome
                  )} in Year ${row.year}." aria-label="Depreciation expense exceeds remaining revenue by ${money(
                    -row.netIncome
                  )} in Year ${row.year}, creating a net loss."></div>`
                : ""
            }
          </div>
          <div class="year-label">Year ${row.year}</div>
          ${isLoss ? `<div class="loss-label">Net loss ${money(row.netIncome)}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

function renderIncomeTarget(metrics) {
  const performanceStatus = getPerformanceStatus(metrics);
  els.incomeTargetPanel.dataset.status = performanceStatus.key;
  els.incomeTargetPanel.classList.toggle(
    "is-hidden",
    performanceStatus.key === "safe" || performanceStatus.key === "pending"
  );

  const chips = {
    danger: `<span class="target-chip danger">Danger: Years 1–2 net income below $50M.</span>`,
    bonus: `<span class="target-chip bonus">Likely bonus: Years 1–2 net income above $60M.</span>`,
  };

  els.incomeTargetChips.innerHTML = chips[performanceStatus.key] || "";
}

function renderStatements(schedule) {
  if (!schedule.length) {
    els.incomeStatementBody.innerHTML = `<p class="statement-empty">Choose a depreciation method to see the financial statement snapshots.</p>`;
    els.balanceSheetBody.innerHTML = `<p class="statement-empty">Choose a depreciation method to see the financial statement snapshots.</p>`;
    return;
  }

  const yearOne = schedule[0];
  const yearTwo = schedule[1] || {
    revenue: facts.annualRevenue,
    depreciation: 0,
    netIncome: facts.annualRevenue - facts.otherCosts,
    accumulatedDepreciation: yearOne.accumulatedDepreciation,
    bookValue: yearOne.bookValue,
  };
  const rows = [
    ["Revenue", yearOne.revenue, yearTwo.revenue, yearOne.revenue + yearTwo.revenue],
    ["Other operating costs", -facts.otherCosts, -facts.otherCosts, -facts.otherCosts * 2],
    [
      "Depreciation expense",
      -yearOne.depreciation,
      -yearTwo.depreciation,
      -(yearOne.depreciation + yearTwo.depreciation),
    ],
    ["Net income", yearOne.netIncome, yearTwo.netIncome, yearOne.netIncome + yearTwo.netIncome],
  ];

  els.incomeStatementBody.innerHTML = `
    <table class="statement-table">
      <thead>
        <tr>
          <th scope="col">Line item</th>
          <th scope="col">Year 1</th>
          <th scope="col">Year 2</th>
          <th scope="col">Years 1-2</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            ([label, year1, year2, total]) => `
              <tr class="${label === "Net income" ? "is-total" : ""}">
                <td>${label}</td>
                <td>${money(year1)}</td>
                <td>${money(year2)}</td>
                <td>${money(total)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  els.balanceSheetBody.innerHTML = `
    <table class="statement-table">
      <thead>
        <tr>
          <th scope="col">Asset snapshot</th>
          <th scope="col">End of Year 1</th>
          <th scope="col">End of Year 2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Equipment cost</td>
          <td>${money(facts.assetCost)}</td>
          <td>${money(facts.assetCost)}</td>
        </tr>
        <tr>
          <td>Less: accumulated depreciation</td>
          <td>${money(-yearOne.accumulatedDepreciation)}</td>
          <td>${money(-yearTwo.accumulatedDepreciation)}</td>
        </tr>
        <tr class="is-total">
          <td>Net equipment book value</td>
          <td>${money(yearOne.bookValue)}</td>
          <td>${money(yearTwo.bookValue)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderPreviewTabs() {
  els.previewTabs.forEach((tab) => {
    const selected = tab.dataset.previewTab === state.previewTab;
    tab.classList.toggle("is-selected", selected);
    tab.setAttribute("aria-selected", String(selected));
  });

  els.previewViews.forEach((view) => {
    const selected = view.dataset.previewView === state.previewTab;
    view.classList.toggle("is-hidden", !selected);
  });
}

function renderLanding() {
  const nameValue = els.studentNameInput.value.trim();
  els.startSimulationButton.disabled = nameValue.length === 0;

  if (authState.status === "signed-in") {
    els.signInStatus.textContent = `Signed in as ${authState.email}. Your endings will be saved.`;
    els.signInStatus.className = "sign-in-status is-success";
  } else if (authState.status === "ready") {
    els.signInStatus.textContent = "Sign in to save endings across sessions and see player statistics.";
    els.signInStatus.className = "sign-in-status";
  } else if (authState.status === "error") {
    els.signInStatus.textContent = "Sign-in is unavailable right now. You can still play, but this ending will not be saved.";
    els.signInStatus.className = "sign-in-status is-error";
  } else {
    els.signInStatus.textContent = "Connecting to sign-in…";
    els.signInStatus.className = "sign-in-status";
  }
}

function decodeGoogleCredential(credential) {
  try {
    const payload = credential.split(".")[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    return JSON.parse(decodeURIComponent(
      window.atob(payload)
        .split("")
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    ));
  } catch (error) {
    return {};
  }
}

function handleGoogleCredential(response) {
  const profile = decodeGoogleCredential(response.credential);
  authState = {
    credential: response.credential,
    email: profile.email || "your NYU account",
    status: "signed-in",
  };

  if (!els.studentNameInput.value.trim() && (profile.given_name || profile.name)) {
    els.studentNameInput.value = profile.given_name || profile.name;
  }

  renderLanding();
  loadEndingProgress();
}

async function loadEndingProgress() {
  if (!authState.credential) {
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/progress`, {
      headers: { Authorization: `Bearer ${authState.credential}` },
    });
    const progress = await response.json();

    if (!response.ok) {
      throw new Error(progress.error || "Saved ending progress could not be loaded.");
    }

    state.endingProgress = {
      ...state.endingProgress,
      ...progress,
    };

    if (state.approved) {
      render();
    }
  } catch (error) {
    console.error("Ending progress lookup failed", error);
  }
}

async function initializeGoogleSignIn() {
  if (!apiBaseUrl || !window.google?.accounts?.id) {
    authState.status = "error";
    renderLanding();
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/config`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Configuration request failed.");
    }

    const config = await response.json();
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.renderButton(els.googleSignInButton, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: Math.min(360, els.googleSignInButton.clientWidth || 360),
    });
    authState.status = "ready";
  } catch (error) {
    console.error("Google sign-in initialization failed", error);
    authState.status = "error";
  }

  renderLanding();
}

function methodLabel(method) {
  return method === "straight" ? "straight-line" : "double-declining balance";
}

function getUsefulLifeWarning(usefulLife = state.usefulLife) {
  if (usefulLife === 6) {
    return {
      severity: "warning",
      title: "I would document the 6-year life very carefully.",
      text:
        "A 6-year useful life may invite scrutiny. AI accelerator server racks do not typically stay economically useful beyond 5 years, so we should be prepared to support why these racks are different.",
    };
  }

  if (usefulLife >= 7) {
    return {
      severity: "urgent",
      title: "I would not want to defend a 7-year life without very strong evidence.",
      text:
        "A 7-year useful life is far outside the norm for AI infrastructure. If the racks do not actually stay useful that long, we may have to recognize new expenses sooner than expected and answer uncomfortable questions about the original estimate.",
    };
  }

  return null;
}

function getAcceptableResidualValue(usefulLife = state.usefulLife) {
  return usefulLife < 5 ? 20 : 10;
}

function getResidualWarning(
  usefulLife = state.usefulLife,
  residualValue = state.residualValue
) {
  const acceptableResidualValue = getAcceptableResidualValue(usefulLife);

  if (residualValue <= acceptableResidualValue) {
    return null;
  }

  if (usefulLife >= 6) {
    return {
      severity: residualValue >= 25 || usefulLife >= 7 ? "urgent" : "warning",
      title:
        residualValue >= 25 || usefulLife >= 7
          ? "This residual value would be hard to defend."
          : "This residual value needs support before I would be comfortable with it.",
      text:
        `${money(residualValue)} residual value is aggressive with a ${usefulLife}-year useful life. Once we are already assuming a long life, assuming more than ${money(10)} of value at disposal raises the risk of a future write-down if we cannot sell the racks for that price.`,
    };
  }

  return {
    severity: residualValue >= 25 ? "urgent" : "warning",
    title:
      residualValue >= 25
        ? "This residual value looks too optimistic without market evidence."
        : "I would document this residual value carefully.",
    text:
      `${money(residualValue)} residual value is above the normal supportable range for a ${usefulLife}-year useful life. If we cannot sell the racks for that amount at the end of their use for us, we could face a write-down later.`,
  };
}

function getPolicyWarnings(policy = state) {
  return [
    getUsefulLifeWarning(policy.usefulLife),
    getResidualWarning(policy.usefulLife, policy.residualValue),
  ].filter(Boolean);
}

function getReasonableSchedule(years = 5) {
  return calculateSchedule(reasonablePolicy, years);
}

function getOutcomeAccountingDetail(policy = state) {
  const chosenSchedule = calculateSchedule(policy, Math.max(5, policy.usefulLife));
  const reasonableSchedule = getReasonableSchedule(Math.max(5, policy.usefulLife));
  const chosenDepreciation = sum(chosenSchedule.slice(0, 2).map((row) => row.depreciation));
  const reasonableDepreciation = sum(reasonableSchedule.slice(0, 2).map((row) => row.depreciation));
  const inflatedIncome = Math.max(0, reasonableDepreciation - chosenDepreciation);

  return {
    chosenDepreciation,
    reasonableDepreciation,
    inflatedIncome,
    chosenShortTermIncome: sum(chosenSchedule.slice(0, 2).map((row) => row.netIncome)),
    reasonableShortTermIncome: sum(reasonableSchedule.slice(0, 2).map((row) => row.netIncome)),
  };
}

function getAggressiveAssumptionSummary(policy = state) {
  const assumptions = [];
  const usefulLifeWarning = getUsefulLifeWarning(policy.usefulLife);
  const residualWarning = getResidualWarning(policy.usefulLife, policy.residualValue);

  if (usefulLifeWarning) {
    assumptions.push(
      `${policy.usefulLife}-year useful life exceeded the normal 5-year support point`
    );
  }

  if (residualWarning) {
    assumptions.push(
      `${money(policy.residualValue)} residual value exceeded the supportable range for a ${policy.usefulLife}-year useful life`
    );
  }

  if (assumptions.length === 0) {
    return "No aggressive estimate was flagged.";
  }

  return assumptions.join("; ");
}

function getEnding(key, values) {
  const content = endingContent[key];

  if (!content) {
    throw new Error(`Missing ending content for ${key}.`);
  }

  return Object.fromEntries(
    Object.entries(content).map(([field, value]) => [
      field,
      typeof value === "function" ? value(values) : value,
    ])
  );
}

function getAccountingTrouble(policy = state) {
  const usefulLifeWarning = getUsefulLifeWarning(policy.usefulLife);
  const residualWarning = getResidualWarning(policy.usefulLife, policy.residualValue);
  const warningCategories = [usefulLifeWarning, residualWarning].filter(Boolean);
  const hasUrgentWarning = warningCategories.some((warning) => warning.severity === "urgent");
  const accountingDetail = getOutcomeAccountingDetail(policy);
  const assumptionSummary = getAggressiveAssumptionSummary(policy);

  if (!hasUrgentWarning && warningCategories.length < 2) {
    return null;
  }

  if (hasUrgentWarning) {
    return {
      key: "audit",
      ...getEnding("audit", { accountingDetail, assumptionSummary, money }),
    };
  }

  return {
    key: "press",
    ...getEnding("press", { accountingDetail, assumptionSummary, money }),
  };
}

function getEmploymentOutcome(metrics) {
  if (metrics.shortTermIncome < performanceTargets.dangerShortTermIncome) {
    return {
      key: "fired",
      ...getEnding("fired", { money, shortTermIncome: metrics.shortTermIncome }),
    };
  }

  if (metrics.shortTermIncome >= performanceTargets.bonusShortTermIncome) {
    return {
      key: "bonus",
      ...getEnding("bonus", {
        money,
        shortTermIncome: metrics.shortTermIncome,
        usefulLife: state.usefulLife,
        residualValue: state.residualValue,
      }),
    };
  }

  return {
    key: "safe",
    ...getEnding("safe", { money, shortTermIncome: metrics.shortTermIncome }),
  };
}

function renderOutcomeDetails(outcome, metrics) {
  const summaryItems = [
    ["Method chosen", methodLabel(state.method)],
    ["Useful life used", `${state.usefulLife} years`],
    ["Residual value used", money(state.residualValue)],
    ["Years 1-2 net income reported", money(metrics.shortTermIncome)],
  ];

  els.outcomeDetails.innerHTML = "";

  const summary = document.createElement("dl");
  summary.className = "outcome-summary";

  summaryItems.forEach(([label, value]) => {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    item.append(term, description);
    summary.append(item);
  });

  els.outcomeDetails.append(summary);

  if (outcome.detailTitle && outcome.detailText) {
    const detail = document.createElement("section");
    detail.className = "outcome-teaching-note";
    const title = document.createElement("h3");
    const text = document.createElement("p");
    title.textContent = outcome.detailTitle;
    text.textContent = outcome.detailText;
    detail.append(title, text);
    els.outcomeDetails.append(detail);
  }

  if (outcome.headline) {
    const headline = document.createElement("aside");
    headline.className = "outcome-headline";
    const label = document.createElement("span");
    const title = document.createElement("strong");
    label.textContent = "Press coverage";
    title.textContent = outcome.headline;
    headline.append(label, title);
    els.outcomeDetails.append(headline);
  }
}

function renderEndingProgress(outcome) {
  const progress = state.endingProgress;
  const unlockedKeys = new Set(progress?.unlockedKeys || [outcome.key]);
  const totalEndings = progress?.totalEndings || endingKeys.length;
  els.endingProgress.classList.remove("is-hidden");
  els.endingCollectionCount.textContent = `${unlockedKeys.size} / ${totalEndings} unlocked`;

  if (!authState.credential) {
    els.endingProgressStatus.textContent =
      "This is one of five possible endings. Sign in before your next playthrough to save your collection and compare results.";
  } else if (state.completionStatus === "saving") {
    els.endingProgressStatus.textContent = "Saving this ending…";
  } else if (state.completionStatus === "error") {
    els.endingProgressStatus.textContent =
      "We could not save this ending. Your result is still shown above, but it was not added to your collection.";
  } else if (progress?.statisticsAvailable) {
    els.endingProgressStatus.textContent =
      `${progress.currentEnding.percentage}% of players reached this ending. You have unlocked ${unlockedKeys.size} of ${totalEndings}.`;
  } else if (progress) {
    els.endingProgressStatus.textContent =
      `You have unlocked ${unlockedKeys.size} of ${totalEndings} endings. Player percentages will appear after ${progress.minimumPlayers} players complete the simulation.`;
  } else {
    els.endingProgressStatus.textContent = "Preparing your ending collection…";
  }

  els.endingGrid.innerHTML = endingKeys
    .map((key, index) => {
      const unlocked = unlockedKeys.has(key);
      const isCurrent = key === outcome.key;
      const label = unlocked ? endingLabels[key] : "Unexplored ending";
      const status = isCurrent
        ? "Current ending"
        : unlocked
          ? "Unlocked"
          : "A different policy may reveal this outcome";
      return `
        <article class="ending-card ${unlocked ? "is-unlocked" : "is-locked"} ${isCurrent ? "is-current" : ""}">
          ${unlocked ? `<span>Ending ${index + 1}</span>` : ""}
          ${unlocked ? "" : '<i class="ending-lock" aria-hidden="true">?</i>'}
          <strong>${label}</strong>
          <small>${status}</small>
        </article>
      `;
    })
    .join("");
}

async function submitCompletion(outcome) {
  if (!authState.credential || state.completionStatus !== "idle") {
    return;
  }

  state.completionStatus = "saving";
  renderEndingProgress(outcome);

  try {
    const response = await fetch(`${apiBaseUrl}/api/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authState.credential}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        runId: state.runId,
        policy: {
          method: state.method,
          usefulLife: state.usefulLife,
          residualValue: state.residualValue,
        },
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The ending could not be saved.");
    }

    if (result.currentEnding.key !== outcome.key) {
      throw new Error("The server and browser calculated different endings.");
    }

    state.endingProgress = result;
    state.completionStatus = "saved";
  } catch (error) {
    console.error("Ending submission failed", error);
    state.completionStatus = "error";
  }

  renderEndingProgress(outcome);
}

function getCurrentOutcome(metrics) {
  return getAccountingTrouble() || getEmploymentOutcome(metrics);
}

function renderFinal(metrics) {
  if (!state.approved || !metrics) {
    els.finalPanel.classList.add("is-hidden");
    els.finalPanel.dataset.outcome = "";
    els.outcomeDetails.innerHTML = "";
    els.endingGrid.innerHTML = "";
    els.endingProgress.classList.add("is-hidden");
    els.endingCollectionCount.textContent = "";
    return;
  }

  const outcome = getCurrentOutcome(metrics);
  els.finalPanel.classList.remove("is-hidden");
  els.finalPanel.dataset.outcome = outcome.key;
  els.finalTitle.textContent = outcome.title;
  els.finalText.textContent = outcome.text;
  renderOutcomeDetails(outcome, metrics);
  renderEndingProgress(outcome);

  if (state.completionStatus === "idle" && authState.credential) {
    window.setTimeout(() => submitCompletion(outcome), 0);
  }
}

function getCfoReviewMessage() {
  const methodName = methodLabel(state.method);
  const notes = [];

  notes.push(
    `You chose ${methodName} depreciation, a ${state.usefulLife}-year useful life, and a ${money(
      state.residualValue
    )} residual value.`
  );

  if (state.method === "accelerated") {
    notes.push(
      "Double-declining balance moves more expense into the early years, which usually lowers near-term net income and raises it later."
    );
  } else {
    notes.push(
      "Straight-line depreciation spreads the expense evenly, so the income effect is steadier year to year."
    );
  }

  if (getPolicyWarnings().length === 0) {
    notes.push(
      "I do not see an obviously aggressive useful life or residual value. We should still be ready to explain the estimates, but these assumptions are easier to support."
    );
  } else {
    notes.push("Before you approve, I want to call out the assumptions most likely to draw questions.");
  }

  return notes.join(" ");
}

function createChatMessage(
  { title, text, actionLabel, action, actions, warnings = [], spotlight = false },
  isNew = false,
  isCurrentTutorialMessage = false
) {
  const message = document.createElement("div");
  message.className = "cfo-message";
  message.classList.toggle("is-new", isNew);
  message.classList.toggle("is-message-spotlight", spotlight);
  message.classList.toggle("is-current-tutorial-message", isCurrentTutorialMessage);

  message.innerHTML = `
    <div class="cfo-avatar" aria-hidden="true" title="CFO">
      <span>CFO</span>
    </div>
    <div class="cfo-copy">
      <div class="chat-bubble">
        <h2></h2>
        <p></p>
      </div>
    </div>
  `;

  message.querySelector("h2").textContent = title;
  message.querySelector("p").textContent = text;

  if (warnings.length > 0) {
    const warningList = document.createElement("div");
    warningList.className = "chat-warning-list";

    warnings.forEach((warning) => {
      const warningItem = document.createElement("section");
      warningItem.className = `chat-warning is-${warning.severity}`;

      const warningTitle = document.createElement("strong");
      warningTitle.textContent = warning.title;

      const warningText = document.createElement("p");
      warningText.textContent = warning.text;

      warningItem.append(warningTitle, warningText);
      warningList.append(warningItem);
    });

    message.querySelector(".chat-bubble").append(warningList);
  }

  const messageActions = actions || (actionLabel && action ? [{ label: actionLabel, action }] : []);

  if (messageActions.length > 0) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "chat-actions";

    messageActions.forEach((messageAction, index) => {
      const button = document.createElement("button");
      button.className = `${index === 0 ? "primary-button" : "secondary-button"} dashboard-action`;
      button.type = "button";
      button.dataset.chatAction = messageAction.action;
      button.textContent = messageAction.label;
      actionsRow.append(button);
    });

    message.querySelector(".chat-bubble").append(actionsRow);
  }

  return message;
}

function getChatMessages(prompt, reviewMode) {
  const displayName = studentName || "there";
  const messages = [
    state.replayMode
      ? {
          title: "Dashboard reopened.",
          text:
            "I reopened the dashboard with all three decisions available. Try a different policy and we can compare how the numbers move.",
        }
      : {
          title: `Hi, ${displayName}.`,
          text:
            "We need to make depreciation decisions for our new AI accelerator server racks. Whatever your decision on our depreciation method, try and keep our net income for the next two years above $50M.",
          actions: state.dashboardOpen
            ? []
            : [
                { label: "Open dashboard", action: "open-dashboard" },
              ],
        },
  ];

  if (state.dashboardOpen && !state.tourSkipped) {
    messages.push({
      title: "Background information.",
      text:
        "We purchased equipment for $100M, expect $80M in annual revenue, and have $35M in operating expense before depreciation.",
      spotlight: state.chatStage === "background",
      actions:
        state.chatStage === "background"
          ? [{ label: "Next: Explore Decisions", action: "show-decision-area" }]
          : [],
    });
  }

  if (
    !state.tourSkipped &&
    (["decision", "active"].includes(state.chatStage) || state.activeStep > 0 || state.approved)
  ) {
    messages.push({
      title: "Start with the depreciation method.",
      text:
        "Choose either straight-line or double-declining depreciation. Your choice changes the timing of depreciation expense and net income.",
      spotlight: state.chatStage === "decision",
      actions:
        state.chatStage === "decision"
          ? [{ label: "Start making decisions", action: "start-decisions" }]
          : [],
    });
  }

  if (state.chatStage === "active" || state.activeStep > 0 || state.approved) {
    const promptLimit = state.approved || state.reviewRequested
      ? cfoPrompts.length - 1
      : state.activeStep === cfoPrompts.length - 1
        ? state.activeStep - 1
        : state.activeStep;
    const reviewPromptIndex = cfoPrompts.length - 1;
    const promptStart = state.replayMode
      ? reviewPromptIndex
      : 1;

    for (let index = promptStart; index <= promptLimit; index += 1) {
      const chatPrompt = cfoPrompts[index];
      const isReviewPrompt = chatPrompt.key === "review";

      messages.push({
        title: state.approved && isReviewPrompt
          ? "Here is the policy we approved."
          : isReviewPrompt
            ? "Here is what I am sending for review."
            : chatPrompt.title,
        text: isReviewPrompt ? getCfoReviewMessage() : chatPrompt.text,
        warnings: isReviewPrompt ? getPolicyWarnings() : [],
        spotlight:
          state.chatStage === "active" &&
          !state.approved &&
          index === promptLimit,
      });
    }
  }

  return messages;
}

function renderChatMessages(prompt, reviewMode) {
  const messages = getChatMessages(prompt, reviewMode);
  const previousCount = messages.length < previousChatMessageCount ? 0 : previousChatMessageCount;
  const shouldFocusNewMessage = messages.length > previousCount && previousCount > 0;

  els.chatThread.innerHTML = "";
  els.chatThread.style.paddingBottom = "";
  messages.forEach((message, index) => {
    const isCurrentTutorialMessage =
      state.chatStage === "active" && !state.approved && index === messages.length - 1;
    els.chatThread.append(
      createChatMessage(message, index >= previousCount, isCurrentTutorialMessage)
    );
  });
  previousChatMessageCount = messages.length;

  requestAnimationFrame(() => {
    const firstNewMessage = shouldFocusNewMessage
      ? els.chatThread.querySelector(".cfo-message.is-new")
      : null;
    const cardStyles = getComputedStyle(els.cfoCard);
    const cardPaddingTop = parseFloat(cardStyles.paddingTop) || 0;
    const cardPaddingBottom = parseFloat(cardStyles.paddingBottom) || 0;
    const currentScrollTop = els.cfoCard.scrollTop;
    const viewportTop = currentScrollTop + cardPaddingTop;
    const viewportBottom = currentScrollTop + els.cfoCard.clientHeight - cardPaddingBottom;
    const desiredScrollTop = (() => {
      if (!firstNewMessage) {
        return els.cfoCard.scrollHeight;
      }

      const messageTop = firstNewMessage.offsetTop;
      const messageBottom = messageTop + firstNewMessage.offsetHeight;
      const messageTopTarget = Math.max(0, messageTop - cardPaddingTop - 10);

      if (messageTop < viewportTop) {
        return messageTopTarget;
      }

      if (messageBottom > viewportBottom) {
        return Math.min(messageTopTarget, currentScrollTop + messageBottom - viewportBottom + 8);
      }

      return Math.min(currentScrollTop, messageTopTarget);
    })();
    const maxScrollTop = Math.max(0, els.cfoCard.scrollHeight - els.cfoCard.clientHeight);

    requestAnimationFrame(() => {
      els.cfoCard.scrollTo({
        top: Math.min(desiredScrollTop, maxScrollTop),
        behavior: messages.length > previousCount ? "smooth" : "auto",
      });
    });
  });
}

function advanceTutorialAfterInput(control) {
  const prompt = cfoPrompts[state.activeStep];

  if (
    state.chatStage !== "active" ||
    state.tourSkipped ||
    state.approved ||
    !prompt ||
    prompt.key !== control
  ) {
    return;
  }

  state.activeStep += 1;
}

function render() {
  const prompt = cfoPrompts[state.activeStep];
  const hasMethod = Boolean(state.method);
  const schedule = hasMethod ? calculateSchedule() : [];
  const metrics = hasMethod ? getMetrics(schedule) : null;
  const reviewMode = prompt.key === "review";
  const controlOrder = ["method", "life", "residual"];
  const unlockedControls = reviewMode || state.tourSkipped
    ? controlOrder
    : controlOrder.slice(0, Math.min(state.activeStep + 1, controlOrder.length));

  els.landingScreen.classList.toggle("is-hidden", state.started);
  els.simulationScreen.classList.toggle("is-hidden", !state.started);
  els.simulationScreen.classList.toggle("is-opening", !state.dashboardOpen);
  els.simulationScreen.classList.toggle("is-complete", state.approved);
  els.simulationScreen.classList.toggle(
    "is-dashboard-focus",
    state.dashboardOpen && ["background", "decision"].includes(state.chatStage)
  );
  els.simulationScreen.classList.toggle("is-background-focus", state.chatStage === "background");
  els.simulationScreen.classList.toggle("is-decision-focus", state.chatStage === "decision");
  els.backgroundInfo.classList.toggle(
    "is-spotlight",
    state.dashboardOpen && state.chatStage === "background"
  );
  els.controlsGrid.classList.toggle("is-spotlight", state.chatStage === "decision");
  els.decisionPanel.classList.toggle("is-ended", state.approved);
  els.decisionPanel.classList.toggle("is-replay-review", state.replayMode && !state.approved);
  els.decisionPanel.classList.toggle(
    "is-guided-tutorial",
    state.chatStage === "active" && !state.tourSkipped && !state.approved
  );
  renderLanding();

  els.decisionHeading.textContent = state.approved ? "End of story" : "Decision area";
  renderChatMessages(prompt, reviewMode);
  const tutorial = state.tutorialStep ? tutorialSteps[state.tutorialStep] : null;
  const showTutorial = state.started && tutorial && state.activeStep === 0 && !state.approved;
  els.startTip.classList.toggle("is-hidden", !showTutorial);
  els.tutorialBackdrop.classList.toggle("is-hidden", !showTutorial);
  updateTutorialFocus(showTutorial);
  if (showTutorial) {
    els.tutorialTitle.textContent = tutorial.title;
    els.tutorialText.textContent = tutorial.text;
    els.dismissTipButton.textContent = tutorial.button;
    positionStartTip();
  }

  els.controls.forEach((control) => {
    const enabled =
      state.chatStage === "active" &&
      !state.approved &&
      unlockedControls.includes(control.dataset.control);
    const visible = state.chatStage === "decision" || enabled;
    const active =
      enabled &&
      (state.tourSkipped ? control.dataset.control === "method" : control.dataset.control === prompt.key);

    control.classList.toggle("is-active", active);
    control.classList.toggle("is-tutorial-highlight", active && !state.tourSkipped);
    control.classList.toggle("is-inactive", !visible);
    control.querySelectorAll("input, button").forEach((input) => {
      input.disabled = !enabled;
    });
  });

  els.methodButtons.forEach((button) => {
    const selected = button.dataset.method === state.method;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  els.lifeInput.value = state.usefulLife;
  els.lifeOutput.textContent = `${state.usefulLife} years`;
  els.incomeChartTitle.textContent = `${getIncomeHorizon()}-year outlook`;
  els.residualInput.value = state.residualValue;
  els.residualOutput.textContent = money(state.residualValue);

  const isReviewStep = state.activeStep === cfoPrompts.length - 1;
  const canOpenReplayReview = state.replayMode && state.activeStep === cfoPrompts.length - 2;
  els.nextButton.parentElement.classList.toggle(
    "is-hidden",
    state.chatStage !== "active" || state.approved || (!isReviewStep && !canOpenReplayReview)
  );
  els.nextButton.textContent = state.reviewRequested
    ? "Approve policy"
    : "Review policy";
  els.nextButton.disabled =
    (!isReviewStep && !canOpenReplayReview) ||
    state.chatStage !== "active" ||
    state.approved ||
    !hasMethod;
  els.nextButton.classList.toggle(
    "is-tutorial-highlight",
    state.chatStage === "active" &&
      !state.approved &&
      !state.tourSkipped &&
      (isReviewStep || canOpenReplayReview)
  );

  els.previewPanel.classList.toggle("is-hidden", !state.dashboardOpen);
  renderPreviewTabs();
  renderIncomeTarget(metrics);

  if (hasMethod) {
    renderIncomeChart(schedule, metrics);
    renderStatements(schedule);
  } else {
    els.incomeChart.innerHTML = "";
    renderStatements([]);
  }

  renderFinal(metrics);
}

function resetGame({ skipTutorial = false } = {}) {
  state = {
    started: true,
    activeStep: skipTutorial ? cfoPrompts.length - 2 : 0,
    approved: false,
    reviewRequested: false,
    tutorialStep: null,
    dashboardOpen: skipTutorial,
    chatStage: skipTutorial ? "active" : "opening",
    tourSkipped: skipTutorial,
    replayMode: skipTutorial,
    previewTab: "charts",
    method: null,
    usefulLife: 3,
    residualValue: 0,
    runId: createRunId(),
    completionStatus: "idle",
    endingProgress: null,
  };
  previousChatMessageCount = 0;
  render();
}

els.methodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.method = button.dataset.method;
    advanceTutorialAfterInput("method");
    render();
  });
});

els.lifeInput.addEventListener("input", (event) => {
  state.usefulLife = Number(event.target.value);
  advanceTutorialAfterInput("life");
  render();
});

els.residualInput.addEventListener("input", (event) => {
  state.residualValue = Number(event.target.value);
  advanceTutorialAfterInput("residual");
  render();
});

els.studentNameInput.addEventListener("input", renderLanding);

els.previewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.previewTab = tab.dataset.previewTab;
    render();
  });
});

els.startSimulationButton.addEventListener("click", () => {
  const nameValue = els.studentNameInput.value.trim();

  if (!nameValue) {
    els.studentNameInput.focus();
    renderLanding();
    return;
  }

  studentName = nameValue;
  state.started = true;
  state.tutorialStep = null;
  render();
});

els.chatThread.addEventListener("click", (event) => {
  const action = event.target.closest("[data-chat-action]")?.dataset.chatAction;

  if (!action) {
    return;
  }

  if (action === "open-dashboard") {
    state.dashboardOpen = true;
    state.chatStage = "background";
    state.tourSkipped = false;
  } else if (action === "show-decision-area") {
    state.chatStage = "decision";
  } else if (action === "start-decisions") {
    state.chatStage = "active";
  }

  render();
});

els.nextButton.addEventListener("click", () => {
  state.tutorialStep = null;

  if (!state.method) {
    return;
  }

  if (state.activeStep === cfoPrompts.length - 1) {
    if (state.reviewRequested) {
      state.approved = true;
    } else {
      state.reviewRequested = true;
    }
  } else if (state.replayMode && state.activeStep === cfoPrompts.length - 2) {
    state.activeStep += 1;
    state.reviewRequested = true;
  }

  render();
});

els.playAgainButton.addEventListener("click", () => {
  resetGame({ skipTutorial: true });
});

els.dismissTipButton.addEventListener("click", () => {
  if (state.tutorialStep === "background") {
    state.tutorialStep = "decision";
  } else if (state.tutorialStep === "decision") {
    state.tutorialStep = "cfo";
  } else {
    state.tutorialStep = null;
  }

  render();
});

window.addEventListener("resize", () => {
  if (state.tutorialStep && state.activeStep === 0 && !state.approved) {
    positionStartTip();
  }
});

window.addEventListener("load", initializeGoogleSignIn);

render();
