const cors = require("cors");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { createGoogleAuthenticator } = require("./auth");
const { OUTCOME_KEYS, calculateOutcome, validatePolicy } = require("./simulation");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createApp({ config, database, authenticate: authenticateOverride }) {
  const app = express();
  const allowedOrigins = new Set(config.allowedOrigins);
  const authenticate = authenticateOverride
    || createGoogleAuthenticator({
      clientId: config.googleClientId,
      allowedDomains: new Set(config.allowedEmailDomains),
    });

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed."));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }));
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", async (req, res, next) => {
    try {
      await database.healthCheck();
      res.json({ ok: true, database: true, rulesetVersion: config.rulesetVersion });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/config", (req, res) => {
    res.set("Cache-Control", "public, max-age=300");
    res.json({ googleClientId: config.googleClientId });
  });

  app.get("/api/progress", authenticate, async (req, res, next) => {
    try {
      const progress = await database.getPlayerProgress({
        playerSub: req.player.sub,
        rulesetVersion: config.rulesetVersion,
      });
      res.json({ ...progress, totalEndings: OUTCOME_KEYS.length });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/completions",
    rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }),
    authenticate,
    async (req, res, next) => {
      const policy = validatePolicy(req.body.policy);
      const runId = String(req.body.runId || "");

      if (!policy || !UUID_PATTERN.test(runId)) {
        res.status(400).json({ error: "A valid run ID and depreciation policy are required." });
        return;
      }

      try {
        const result = calculateOutcome(policy);
        await database.recordCompletion({
          playerSub: req.player.sub,
          rulesetVersion: config.rulesetVersion,
          runId,
          policy,
          result,
        });
        const progress = await database.getOutcomeProgress({
          playerSub: req.player.sub,
          rulesetVersion: config.rulesetVersion,
          outcomeKey: result.outcomeKey,
          minimumPlayers: config.minimumPlayers,
        });

        res.json({
          ...progress,
          totalEndings: OUTCOME_KEYS.length,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const status = error.message === "Origin is not allowed." ? 403 : 500;
    if (status === 500) {
      console.error(error);
    }
    res.status(status).json({ error: status === 500 ? "The service could not complete the request." : error.message });
  });

  return app;
}

module.exports = { createApp };
