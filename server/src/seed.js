// Builds the first state of the database: a starting price for every offer and
// a deterministic 12-month history. This is *sample data*: the watcher replaces
// it with real prices as soon as the live sources answer (see engine.js).
import { CATALOG } from "./catalog.js";
import { REGIONS } from "./regions.js";
import { FALLBACK_RATES } from "./fx.js";
import { SAMPLE_KEYSHOPS } from "./stores.js";

const DAY = 86_400_000;
export const r2 = (v) => Math.round(v * 100) / 100;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic sale windows over the last 12 months: [{ from, to, disc }]. */
export function saleWindows(game, now) {
  if (game.upcoming || !game.seed || game.seed.noSales) return []; // live-only games: no invented sales
  const rand = rng(game.seed.rngSeed || 1);
  const release = new Date(game.release + "T00:00:00").getTime();
  const start = Math.max(release, now - 365 * DAY);
  const span = (now - start) / DAY;
  const discs = [0.2, 0.25, 0.33, 0.4, 0.5];
  const out = [];
  let day = 30 + Math.floor(rand() * 30);
  while (day < span - 45) {
    const len = 7 + Math.floor(rand() * 9);
    out.push({ from: start + day * DAY, to: start + (day + len) * DAY, disc: discs[Math.floor(rand() * discs.length)] });
    day += len + 45 + Math.floor(rand() * 50);
  }
  const usBase = usBasePrice(game);
  if (game.seed.lowUsd && usBase && out.length) out[Math.floor(out.length / 2)].disc = 1 - game.seed.lowUsd / usBase;
  return out.filter((w) => w.to < now - 3 * DAY);
}

export const usBasePrice = (game) => {
  if (!game.seed) return null;
  const steam = game.seed.offers.find((o) => o.store === "steam");
  return steam ? steam.base : Math.max(0, ...game.seed.offers.map((o) => o.base));
};

/** Step history [{ t, usd, store }] from a regular price and sale windows. */
export function buildSteps({ game, base, current, currentStore, windows, now, deeper = 1, store = "steam" }) {
  const release = new Date(game.release + "T00:00:00").getTime();
  const start = Math.max(release, now - 365 * DAY);
  const steps = [];
  const push = (t, usd, st) => {
    const last = steps[steps.length - 1];
    if (!last || last.usd !== usd || last.store !== st) steps.push({ t: Math.round(t), usd, store: st });
  };
  let cursor = start;
  for (const w of windows) {
    if (w.from > cursor) push(cursor, r2(base), store);
    push(Math.max(w.from, cursor), r2(base * (1 - Math.min(0.85, w.disc * deeper))), store);
    cursor = w.to;
  }
  push(cursor, r2(base), store);
  push(now, r2(current), currentStore);
  return steps;
}

export function seedHistoryFor(game, offers, now) {
  const history = { official: {}, key: [] };
  if (game.upcoming) return history;
  const windows = saleWindows(game, now);
  for (const r of REGIONS) {
    const list = Object.values(offers).filter((o) => o.kind === "official" && o.prices[r.code]);
    if (!list.length) continue;
    const best = list.reduce((a, b) => (b.prices[r.code].usd < a.prices[r.code].usd ? b : a));
    const st = list.find((o) => o.store === "steam");
    const base = st ? st.prices[r.code].base : Math.max(...list.map((o) => o.prices[r.code].base));
    history.official[r.code] = buildSteps({ game, base, current: best.prices[r.code].usd, currentStore: best.store, windows, now });
  }
  const keys = Object.values(offers).filter((o) => o.kind === "key");
  if (keys.length) {
    const best = keys.reduce((a, b) => (b.price.usd < a.price.usd ? b : a));
    const base = Math.max(...keys.map((o) => o.price.base));
    history.key = buildSteps({
      game,
      base,
      current: best.price.usd,
      currentStore: best.store,
      windows,
      now,
      deeper: 1.15,
      store: best.store,
    });
  }
  return history;
}

export function buildSeed(now = Date.now()) {
  const state = {
    version: 1,
    seededAt: now,
    fx: { rates: { ...FALLBACK_RATES }, updatedAt: 0, source: "fallback" },
    offers: {},
    history: {},
    calibrated: {}, // "gameId|region" -> true once a live price replaced the sample one
    ggLow: {},
    changes: [],
    contacts: [],
    lists: {}, // "My list" per anonymous browser id — see wishlist.js
    status: { lastRun: null, lastOk: null, runs: 0, nextRun: null, steam: {}, ggdeals: {}, fx: {} },
  };
  for (const g of CATALOG) {
    const offers = {};
    if (!g.seed) {
      // Imported game: starts empty, the watcher fills it with real prices.
      state.offers[g.id] = offers;
      state.history[g.id] = { official: {}, key: [] };
      continue;
    }
    for (const o of g.seed.offers) {
      const prices = {};
      for (const r of REGIONS) {
        const base = r2(o.base * r.factor);
        prices[r.code] = { usd: r2(base * (1 - o.off)), base, src: "sample", at: now };
      }
      offers[o.store] = { store: o.store, kind: "official", prices };
    }
    if (g.seed.keysRatio && !g.upcoming) {
      const rand = rng((g.seed.rngSeed || 1) * 7919);
      const usBase = usBasePrice(g);
      const bestOff = Math.max(0, ...g.seed.offers.map((o) => o.off));
      for (const shop of SAMPLE_KEYSHOPS) {
        const ratio = g.seed.keysRatio * (0.95 + rand() * 0.14);
        offers[shop] = {
          store: shop,
          kind: "key",
          price: { usd: r2(usBase * ratio * (1 - bestOff * 0.6)), base: r2(usBase * Math.min(1, ratio * 1.2)), src: "sample", at: now },
        };
      }
    }
    state.offers[g.id] = offers;
    state.history[g.id] = seedHistoryFor(g, offers, now);
  }
  return state;
}
