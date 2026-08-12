const { createApp } = require("./app");
const { loadConfig } = require("./config");
const { createDatabase } = require("./database");

async function start() {
  const config = loadConfig();
  const database = createDatabase(config.databaseUrl);
  await database.initialize();
  const app = createApp({ config, database });

  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Depreciation simulation API listening on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error("API startup failed", error);
  process.exit(1);
});
