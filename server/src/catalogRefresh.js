// Keeps the imported catalog up to date on its own: every CATALOG_REFRESH_DAYS days
// the Steam import runs again in the background (new top sellers come in, metadata
// is refreshed), then the catalog is reloaded without restarting the server.
import fs from "node:fs";
import { config } from "./config.js";
import { IMPORTED_FILE, reloadCatalog, CATALOG } from "./catalog.js";
import { importCatalog } from "../scripts/import-steam.js";

const DAY = 86_400_000;
const CHECK_EVERY = 6 * 3_600_000; // look at the file age every 6 hours

/** Age of the imported catalog file in ms (Infinity when there is none). */
const catalogAge = () => (fs.existsSync(IMPORTED_FILE) ? Date.now() - fs.statSync(IMPORTED_FILE).mtimeMs : Infinity);

export function startCatalogRefresh(engine, { days = config.catalogRefreshDays, importer = importCatalog } = {}) {
  if (!days) return null;
  let running = false;

  async function check() {
    if (running || catalogAge() < days * DAY) return;
    running = true;
    try {
      const count = Math.max(500, CATALOG.filter((g) => !g.seed).length);
      // Slower than the command-line import: the price watcher also talks to Steam.
      const out = await importer({ count, delay: 2500, log: (m) => console.log("[catalog]", m) });
      reloadCatalog();
      engine.ensureGames();
      console.log(`[catalog] reloaded: ${CATALOG.length} games (${out.added} new). Prices follow at the next check.`);
    } catch (err) {
      console.warn("[catalog] refresh failed:", err.message);
    } finally {
      running = false;
    }
  }

  const first = setTimeout(check, 60_000); // let the first price check run first
  const timer = setInterval(check, CHECK_EVERY);
  first.unref?.();
  timer.unref?.();
  return { check, stop: () => (clearTimeout(first), clearInterval(timer)) };
}
