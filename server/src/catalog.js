import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(here, f), "utf8"));
export const IMPORTED_FILE = path.join(here, "catalog.imported.json");

/**
 * Game metadata (titles, studios, descriptions…):
 *  - catalog.json: the hand-written showcase games (sample prices for stores without an API);
 *  - catalog.imported.json: hundreds of games imported from Steam by scripts/import-steam.js.
 *    They are "live-only" (`source: "steam"`): every price comes from Steam / gg.deals.
 */
export const CATALOG = [];
const byId = new Map();
export const gameById = (id) => byId.get(id);

// Imported games keep Steam's image URLs in `imgSrc`; the browser gets small WebP
// versions through the image proxy (images.js).
const proxied = (g) => ({
  ...g,
  imgSrc: g.img,
  img: Object.fromEntries(["cover", "coverSm", "hero", "heroSm"].map((k) => [k, `/api/img/${g.id}/${k}`])),
});

/** (Re)reads both files. CATALOG is updated in place, so every module sees the new games. */
export function reloadCatalog() {
  const curated = read("catalog.json");
  const imported = fs.existsSync(IMPORTED_FILE) ? read("catalog.imported.json") : [];
  const known = new Set(curated.map((g) => g.appid));
  CATALOG.splice(0, CATALOG.length, ...curated, ...imported.filter((g) => !known.has(g.appid)).map(proxied));
  byId.clear();
  for (const g of CATALOG) byId.set(g.id, g);
  return CATALOG.length;
}
reloadCatalog();

/** Live-only game: no seed data, prices only from the live sources. */
export const isLiveOnly = (game) => !game.seed;
