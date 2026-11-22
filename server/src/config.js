// Central configuration. Everything can be overridden with environment variables
// (or a server/.env file — see .env.example).
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, "..");

try {
  process.loadEnvFile(path.join(SERVER_ROOT, ".env"));
} catch {
  /* no .env file: use defaults */
}

const env = process.env;
const demo = process.argv.includes("--demo") || env.DEMO_DRIFT === "1";

export const config = {
  port: Number(env.PORT) || 3001,
  dataFile: env.DATA_FILE || path.join(SERVER_ROOT, "data", "state.json"),
  clientDist: env.CLIENT_DIST || path.join(SERVER_ROOT, "..", "client", "dist"),

  // How often the price watcher polls the stores (minutes).
  refreshMinutes: Number(env.REFRESH_MINUTES) || 10,
  // Re-import the Steam catalog every N days in the background (0 = never; see catalogRefresh.js).
  catalogRefreshDays: Number(env.CATALOG_REFRESH_DAYS ?? 7),
  // Minimum delay between two manual refreshes (the "Check now" button).
  manualRefreshCooldownSec: 30,

  // Live sources
  steam: {
    enabled: env.STEAM_LIVE !== "0",
    base: env.STEAM_API_BASE || "https://store.steampowered.com",
    delayMs: Number(env.STEAM_DELAY_MS ?? 400), // pause between regions (be polite)
    timeoutMs: 12000,
  },
  fx: {
    enabled: env.FX_LIVE !== "0",
    url: env.FX_URL || "https://open.er-api.com/v6/latest/USD",
    maxAgeHours: 12,
  },
  ggdeals: {
    key: env.GGDEALS_API_KEY || "", // optional: live keyshop prices
    base: env.GGDEALS_API_BASE || "https://api.gg.deals",
    timeoutMs: 12000,
  },

  // Demo mode: only the *sample* prices (stores without a public API) drift
  // randomly so you can watch live updates without waiting for a real sale.
  demo: {
    enabled: demo,
    everySeconds: Number(env.DEMO_DRIFT_SECONDS) || 15,
  },
};
