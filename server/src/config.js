function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadConfig(environment = process.env) {
  const config = {
    allowedEmailDomains: splitList(environment.ALLOWED_EMAIL_DOMAINS),
    allowedOrigins: splitList(environment.ALLOWED_ORIGINS),
    databaseUrl: environment.DATABASE_URL,
    googleClientId: environment.GOOGLE_CLIENT_ID,
    minimumPlayers: Number(environment.MIN_STATS_PLAYERS || 10),
    port: Number(environment.PORT || 3000),
    rulesetVersion: String(environment.OUTCOME_RULESET_VERSION || "1"),
  };

  const missing = [
    ["ALLOWED_EMAIL_DOMAINS", config.allowedEmailDomains.length],
    ["ALLOWED_ORIGINS", config.allowedOrigins.length],
    ["DATABASE_URL", config.databaseUrl],
    ["GOOGLE_CLIENT_ID", config.googleClientId],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!Number.isInteger(config.minimumPlayers) || config.minimumPlayers < 1) {
    throw new Error("MIN_STATS_PLAYERS must be a positive integer.");
  }

  return config;
}

module.exports = { loadConfig };
