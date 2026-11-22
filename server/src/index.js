import { config } from "./config.js";
import { Store } from "./store.js";
import { Engine } from "./engine.js";
import { createApp } from "./api.js";
import { startCatalogRefresh } from "./catalogRefresh.js";

const store = new Store();
const engine = new Engine(store);
const app = createApp(engine);

const server = app.listen(config.port, () => {
  console.log(`PlayRadar API    → http://localhost:${config.port}/api/meta`);
  console.log(
    `Price watcher    → every ${config.refreshMinutes} min · Steam live: ${config.steam.enabled ? "on" : "off"} · gg.deals: ${config.ggdeals.key ? "on" : "off (no key)"}`
  );
  engine.start();
  startCatalogRefresh(engine);
});

const shutdown = () => {
  engine.stop();
  store.flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
