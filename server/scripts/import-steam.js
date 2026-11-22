// Builds src/catalog.imported.json: hundreds of real games taken from Steam itself.
//
//   npm run import:games -w server -- --count 500
//
// 1. Discovery — Steam's own charts (public, no key):
//      store "Top sellers" search pages + ISteamChartsService/GetMostPlayedGames.
//    (SteamDB forbids automated collection and has no API: its data comes from these
//     same Steam APIs, so we go to the source.)
// 2. Details — store appdetails for each candidate (name, studio, genres, release,
//    description, PC requirements, images) + the 3 latest official announcements.
// 3. Only paid, released-or-dated games are kept. Free-to-play titles, DLC, hardware
//    and soundtracks are skipped: there is no price to compare.
//
// Prices are NOT stored here: the server's watcher fetches them live from Steam
// (9 regions) and, with a key, from the gg.deals Prices API (keyshops, all-time lows).
// Every Steam answer is cached in data/import-cache/, so an interrupted run resumes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
export const OUT = path.join(ROOT, "src", "catalog.imported.json");
const CURATED = path.join(ROOT, "src", "catalog.json");
const CACHE = path.join(ROOT, "data", "import-cache");

const DAY = 86_400_000;
let DELAY = 1600; // ms between store requests: Steam allows ~200 per 5 minutes
const UA = { "User-Agent": "PlayRadar-student-project/1.0", "Accept-Language": "en-US,en;q=0.9" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, { retries = 3 } = {}) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: UA }).catch((e) => ({ ok: false, status: 0, err: e }));
    if (res.ok) return res.json();
    if (i >= retries) throw new Error(`${res.status || res.err?.code} for ${url}`);
    // 429 / 403 = rate limited: back off generously
    await sleep(res.status === 429 || res.status === 403 ? 60_000 : 5_000);
  }
}

/** Cached fetch: Steam answers are kept on disk for `maxAge` ms, so reruns barely touch Steam. */
async function cached(name, url, maxAge = Infinity) {
  const file = path.join(CACHE, name + ".json");
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < maxAge)
    return { data: JSON.parse(fs.readFileSync(file, "utf8")), hit: true };
  const data = await getJson(url);
  fs.writeFileSync(file, JSON.stringify(data));
  return { data, hit: false };
}

async function exists(url) {
  const res = await fetch(url, { method: "HEAD", headers: UA }).catch(() => null);
  return !!res && res.ok;
}

/* ------------------------------------------------------------- parsing */

const ENT = {
  "&quot;": '"',
  "&amp;": "&",
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&reg;": "®",
  "&trade;": "™",
};
export const strip = (html = "") =>
  String(html)
    .replace(/<[^>]+>/g, " ") // tags (and BBCode below) become spaces so words never glue together
    .replace(/\[\/?[a-z0-9*]+(=[^\]]*)?\]/gi, " ") // BBCode used in Steam news
    .replace(/&[a-z#0-9]+;/gi, (e) => ENT[e.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .replace(/ ([,.;:!?])/g, "$1")
    .trim();

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** "Feb 24, 2022" | "24 Feb, 2022" → "2022-02-24"; "Q2 2027" | "2027" → "2027"; else null. */
export function parseRelease(s = "") {
  const t = s.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  let m = /^([A-Za-z]{3})[a-z]*\.? (\d{1,2}) (\d{4})$/.exec(t) || /^(\d{1,2}) ([A-Za-z]{3})[a-z]*\.? (\d{4})$/.exec(t);
  if (m) {
    const [mon, day] = isNaN(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const mo = MONTHS[mon.toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  m = /(\d{4})/.exec(t);
  return m ? m[1] : null;
}

/** Steam's requirement HTML → { "OS": "Windows 10", "Memory": "16 GB RAM", … } */
export function parseRequirements(html) {
  if (!html || typeof html !== "string") return null;
  const out = {};
  for (const li of html.split(/<li>/i).slice(1)) {
    const m = /<strong>([^<:]+):?<\/strong>:?\s*([\s\S]*)/i.exec(li);
    if (m) {
      const v = strip(m[2]);
      if (v) out[strip(m[1])] = v.slice(0, 160);
    }
  }
  return Object.keys(out).length ? out : null;
}

export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "game";

const PEGI = new Set([3, 7, 12, 16, 18]);
// Steam tags some games with software categories: not useful as game genres in the filters.
const SOFTWARE_GENRES = new Set([
  "Animation & Modeling",
  "Design & Illustration",
  "Education",
  "Utilities",
  "Web Publishing",
  "Audio Production",
  "Video Production",
  "Photo Editing",
  "Software Training",
  "Game Development",
  "Accounting",
]);
const CDN = (id, f) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/${f}`;

/* ------------------------------------------------------------ discovery */

async function discover(exclude, target) {
  const ids = [];
  const add = (id) => !exclude.has(id) && !ids.includes(id) && ids.push(id);
  // Top sellers (what people buy now) — most relevant for a price tracker.
  for (let start = 0; ids.length < target * 2.2 && start < 2500; start += 100) {
    const { data, hit } = await cached(
      `topsellers-${start}`,
      `https://store.steampowered.com/search/results/?filter=topsellers&json=1&start=${start}&count=100&cc=us&l=english`,
      2 * DAY // charts change every day
    );
    const before = ids.length;
    for (const it of data.items || []) {
      const m = /\/apps\/(\d+)\//.exec(it.logo || "");
      if (m) add(Number(m[1]));
    }
    if (ids.length === before) break;
    if (!hit) await sleep(DELAY);
  }
  // Most played (popular games that are not on sale right now).
  const { data: mp } = await cached("mostplayed", "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/", 2 * DAY);
  for (const r of mp.response?.ranks || []) add(r.appid);
  return ids;
}

/* --------------------------------------------------------------- import */

async function build(appid, rank) {
  const { data: raw, hit } = await cached(
    `app-${appid}`,
    `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=english`,
    30 * DAY // descriptions and requirements rarely change (prices are never taken from here)
  );
  if (!hit) await sleep(DELAY);
  const e = raw && raw[appid];
  if (!e || !e.success) return { skip: "unavailable" };
  const d = e.data;
  if (d.type !== "game") return { skip: d.type || "not a game" };
  if (d.is_free) return { skip: "free to play" };
  const upcoming = !!d.release_date?.coming_soon;
  const release = parseRelease(d.release_date?.date);
  if (!release) return { skip: "no release date" };
  if (!upcoming && !d.price_overview) return { skip: "not sold" };

  // Images: the classic file names exist for most games; recent ones only have hashed URLs.
  const hasCover = await exists(CDN(appid, "library_600x900.jpg"));
  const hasHero = await exists(CDN(appid, "library_hero.jpg"));
  const cover = hasCover ? CDN(appid, "library_600x900.jpg") : d.header_image;
  const hero = hasHero ? CDN(appid, "library_hero.jpg") : d.background_raw || d.header_image;

  const { data: news } = await cached(
    `news-${appid}`,
    `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=3&maxlength=280&feeds=steam_community_announcements&format=json`,
    7 * DAY
  ).catch(() => ({ data: null }));

  const pegi = Number(d.ratings?.pegi?.rating);
  const title = d.name.trim(); // official Steam name, unchanged
  return {
    game: {
      id: null, // set by the caller (must be unique)
      appid,
      title,
      edition: null,
      aliases: "",
      studio: (d.developers || [])[0] || (d.publishers || [])[0] || "Unknown",
      publisher: (d.publishers || [])[0] || (d.developers || [])[0] || "Unknown",
      studioCity: null,
      genres: (d.genres || [])
        .map((g) => g.description)
        .filter((g) => !SOFTWARE_GENRES.has(g))
        .slice(0, 4),
      platforms: ["PC"],
      pegi: PEGI.has(pegi) ? pegi : null,
      pegiDesc: d.ratings?.pegi?.descriptors ? strip(d.ratings.pegi.descriptors).slice(0, 120) : null,
      release,
      upcoming,
      hours: null,
      tagline: strip(d.short_description).slice(0, 220),
      description: strip(d.about_the_game || d.short_description).slice(0, 1400),
      requirements: { min: parseRequirements(d.pc_requirements?.minimum), rec: parseRequirements(d.pc_requirements?.recommended) },
      updates: (news?.appnews?.newsitems || []).map((n) => ({
        date: new Date(n.date * 1000).toISOString().slice(0, 10),
        title: strip(n.title).slice(0, 140),
        text: strip(n.contents).slice(0, 260),
        url: n.url,
      })),
      img: { cover, coverSm: cover, hero, heroSm: hasHero ? CDN(appid, "capsule_616x353.jpg") : d.header_image },
      editions: null,
      source: "steam", // live-only game: no sample prices (see engine.js)
      rank,
    },
  };
}

/**
 * Imports the current Steam charts and merges them with the previous catalog:
 * - a game keeps its id (lists, history and change feed are keyed on it);
 * - games that left the charts are kept (someone may track them), ranked after the rest.
 * The file is written once, at the end, so a half-finished run never shrinks the catalog.
 */
export async function importCatalog({ count = 500, delay = 1600, log = console.log } = {}) {
  DELAY = delay;
  fs.mkdirSync(CACHE, { recursive: true });
  const curated = JSON.parse(fs.readFileSync(CURATED, "utf8"));
  const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];
  const prevByApp = new Map(previous.map((g) => [g.appid, g]));
  const exclude = new Set(curated.map((g) => g.appid));
  const ids = new Set(curated.map((g) => g.id));

  log(`Discovering games on Steam (target ${count})…`);
  const candidates = await discover(exclude, count);
  log(`${candidates.length} candidates. Fetching details (cached answers are reused)…`);

  const games = [];
  const skipped = {};
  for (const [i, appid] of candidates.entries()) {
    if (games.length >= count) break;
    try {
      const r = await build(appid, i + 1);
      if (r.skip) {
        skipped[r.skip] = (skipped[r.skip] || 0) + 1;
        continue;
      }
      let id = prevByApp.get(appid)?.id || slugify(r.game.title);
      if (ids.has(id)) id = `${id}-${appid}`;
      ids.add(id);
      games.push({ ...r.game, id });
      if (games.length % 50 === 0) log(`  ${games.length}/${count} games (${i + 1} candidates checked)`);
    } catch (err) {
      log(`  ! ${appid}: ${err.message}`);
    }
  }
  const fresh = new Set(games.map((g) => g.appid));
  const kept = previous.filter((g) => !fresh.has(g.appid) && !ids.has(g.id)).map((g) => ({ ...g, rank: 10_000 + (g.rank % 10_000) }));
  const all = [...games, ...kept];
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2) + "\n");
  const added = games.filter((g) => !prevByApp.has(g.appid)).length;
  log(`Done: ${all.length} games (${added} new, ${kept.length} kept from before) → ${path.relative(process.cwd(), OUT)}`);
  log(`Skipped: ${JSON.stringify(skipped)}`);
  return { total: all.length, added, kept: kept.length };
}

// Run only when executed directly (the parsers are imported by the tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name, d) => {
    const i = process.argv.indexOf("--" + name);
    return i > 0 ? Number(process.argv[i + 1]) : d;
  };
  importCatalog({ count: arg("count", 500), delay: arg("delay", 1600) }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
