const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

function startTestServer() {
  const recorded = [];
  const database = {
    async healthCheck() {},
    async recordCompletion(value) { recorded.push(value); },
    async getOutcomeProgress({ outcomeKey }) {
      return {
        statisticsAvailable: true,
        minimumPlayers: 1,
        totalPlayers: 1,
        currentEnding: { key: outcomeKey, percentage: 100 },
        unlockedKeys: [outcomeKey],
      };
    },
    async getPlayerProgress() {
      return { unlockedKeys: ["safe", "bonus"] };
    },
  };
  const config = {
    allowedEmailDomains: ["nyu.edu"],
    allowedOrigins: ["http://localhost:4000"],
    googleClientId: "test.apps.googleusercontent.com",
    minimumPlayers: 1,
    rulesetVersion: "1",
  };
  const authenticate = (req, res, next) => {
    req.player = { sub: "google-player-1" };
    next();
  };
  const app = createApp({ config, database, authenticate });
  const server = app.listen(0, "127.0.0.1");
  return { server, recorded };
}

test("health check confirms database availability", async (context) => {
  const { server } = startTestServer();
  context.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, database: true, rulesetVersion: "1" });
});

test("completion endpoint derives and returns the ending", async (context) => {
  const { server, recorded } = startTestServer();
  context.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      runId: "123e4567-e89b-42d3-a456-426614174000",
      policy: { method: "straight", usefulLife: 6, residualValue: 10 },
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.currentEnding.key, "bonus");
  assert.equal(body.currentEnding.percentage, 100);
  assert.equal(body.totalEndings, 5);
  assert.equal(recorded[0].result.outcomeKey, "bonus");
});

test("progress endpoint returns a signed-in player's previous ending unlocks", async (context) => {
  const { server } = startTestServer();
  context.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/progress`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    unlockedKeys: ["safe", "bonus"],
    totalEndings: 5,
  });
});
