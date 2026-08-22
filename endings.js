// Edit the outcome copy here. Dynamic values are supplied by app.js in the values object.
window.DEPRECIATION_ENDINGS = Object.freeze({
  fired: {
    title: "You got fired",
    text:
      "The board was dissatisfied with the company's near-term results and replaced you as CEO.",
    detailTitle: "Accounting analysis",
    detailText:
      "The accounting policy may have been supportable, but it did not produce the near-term earnings story the board wanted. Aster recognized too much depreciation expense in the first two years to satisfy the board's short-term mandate.",
  },
  safe: {
    title: "You kept your job",
    text: "The board kept you as CEO, but did not award you a bonus.",
    detailTitle: "Accounting analysis",
    detailText:
      "You avoided leaning too hard on useful life or residual value to manufacture short-term earnings. While this made your policy easy to justify to auditors and analysts, the board did not give you a performance incentive based on net income expectations over the next two years.",
  },
  bonus: {
    title: "You were given a bonus!",
    text:
      "The company’s near-term performance impressed the board, and you were given a bonus.",
    detailTitle: "Accounting analysis",
    detailText: ({ money, residualValue, usefulLife }) =>
      `The ${usefulLife}-year useful life was a little higher than the norm, but the ${money(residualValue)} residual value stayed within a supportable range. The policy improved near-term earnings without crossing into an audit failure.`,
  },
  press: {
    title: "You earned a bonus...but it was rescinded after some bad press.",
    text:
      "Uncomfortable questions raised in the press about the company's depreciation estimates led the board to rescind your bonus.",
    detailTitle: "Accounting analysis",
    detailText: ({ assumptionSummary }) =>
      `${assumptionSummary}. Auditors and analysts viewed those assumptions as aggressive because they reduced depreciation early while increasing the risk of a later write-down if the racks could not be used or sold as estimated. Aster avoided a full audit failure, but the board no longer treated the reported earnings as a clean basis for incentive pay.`,
    headline:
      "The Wall Street Journal: Aster Compute’s Accounting Practices Raise Questions About Earnings",
  },
  audit: {
    title: "Audit failure and termination",
    text:
      "Auditors required a correction to the company's depreciation estimates, and the board terminated you.",
    detailTitle: "Accounting analysis",
    detailText: ({ assumptionSummary }) =>
      `${assumptionSummary}. While the chosen policies maximized near-term income, they relied on depreciation decisions the company could not reasonably support. Once the board learned that the CEO pushed for this policy, it became clear the audit failure was a leadership failure and a change at the top was necessary.`,
  },
});
