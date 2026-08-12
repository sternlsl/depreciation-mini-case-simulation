const { Pool } = require("pg");

function createDatabase(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });

  async function initialize() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        google_sub TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS completions (
        id BIGSERIAL PRIMARY KEY,
        run_id UUID NOT NULL,
        player_sub TEXT NOT NULL REFERENCES players(google_sub) ON DELETE CASCADE,
        ruleset_version TEXT NOT NULL,
        outcome_key TEXT NOT NULL CHECK (outcome_key IN ('fired', 'safe', 'bonus', 'press', 'audit')),
        method TEXT NOT NULL CHECK (method IN ('straight', 'accelerated')),
        useful_life SMALLINT NOT NULL CHECK (useful_life BETWEEN 1 AND 7),
        residual_value SMALLINT NOT NULL CHECK (residual_value BETWEEN 0 AND 30),
        short_term_income NUMERIC(8, 2) NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (player_sub, ruleset_version, run_id)
      );

      CREATE INDEX IF NOT EXISTS completions_ruleset_outcome_idx
        ON completions (ruleset_version, outcome_key, player_sub);
    `);
  }

  async function recordCompletion({ playerSub, rulesetVersion, runId, policy, result }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO players (google_sub)
         VALUES ($1)
         ON CONFLICT (google_sub)
         DO UPDATE SET last_seen_at = NOW()`,
        [playerSub]
      );
      await client.query(
        `INSERT INTO completions (
           run_id, player_sub, ruleset_version, outcome_key, method,
           useful_life, residual_value, short_term_income
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (player_sub, ruleset_version, run_id) DO NOTHING`,
        [
          runId,
          playerSub,
          rulesetVersion,
          result.outcomeKey,
          policy.method,
          policy.usefulLife,
          policy.residualValue,
          result.shortTermIncome,
        ]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function getOutcomeProgress({ playerSub, rulesetVersion, outcomeKey, minimumPlayers }) {
    const [totalsResult, outcomeResult, unlocksResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT player_sub)::int AS count
         FROM completions
         WHERE ruleset_version = $1`,
        [rulesetVersion]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT player_sub)::int AS count
         FROM completions
         WHERE ruleset_version = $1 AND outcome_key = $2`,
        [rulesetVersion, outcomeKey]
      ),
      pool.query(
        `SELECT DISTINCT outcome_key
         FROM completions
         WHERE ruleset_version = $1 AND player_sub = $2`,
        [rulesetVersion, playerSub]
      ),
    ]);

    const totalPlayers = totalsResult.rows[0].count;
    const outcomePlayers = outcomeResult.rows[0].count;
    const statisticsAvailable = totalPlayers >= minimumPlayers;

    return {
      statisticsAvailable,
      minimumPlayers,
      sampleSize: statisticsAvailable ? totalPlayers : null,
      currentEnding: {
        key: outcomeKey,
        percentage: statisticsAvailable
          ? Math.round((outcomePlayers / totalPlayers) * 100)
          : null,
      },
      unlockedKeys: unlocksResult.rows.map((row) => row.outcome_key),
    };
  }

  async function healthCheck() {
    await pool.query("SELECT 1");
  }

  return { healthCheck, initialize, recordCompletion, getOutcomeProgress };
}

module.exports = { createDatabase };
