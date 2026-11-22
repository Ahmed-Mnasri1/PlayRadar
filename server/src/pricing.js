// Read-only price logic: turns the raw state into what the API returns.
// All amounts are US dollars.
import { STORES, storeUrl } from "./stores.js";
import { REGIONS } from "./regions.js";
import { r2 } from "./seed.js";

const DAY = 86_400_000;

export function officialOffers(state, gameId, region) {
  return Object.values(state.offers[gameId] || {})
    .filter((o) => o.kind === "official" && o.prices && o.prices[region])
    .map((o) => ({ store: o.store, url: o.url, ...o.prices[region] }));
}

/** Keyshop offers. A live gg.deals price replaces the sample keyshops. */
export function keyOffers(state, gameId) {
  const all = Object.values(state.offers[gameId] || {}).filter((o) => o.kind === "key" && o.price);
  const live = all.filter((o) => o.price.src === "live");
  return (live.length ? live : all).map((o) => ({ store: o.store, ...o.price, url: o.url }));
}

/** Regular ("list") price used as the reference: Steam's when known, else the highest. */
export const refBase = (list) => {
  const steam = list.find((o) => o.store === "steam");
  return list.length ? (steam ? steam.base : Math.max(...list.map((o) => o.base))) : null;
};
export const cheapest = (list) => (list.length ? list.reduce((a, b) => (b.usd < a.usd ? b : a)) : null);
const pct = (price, base) => (base > 0 ? Math.max(0, Math.round((1 - price / base) * 100)) : 0);

function lowOf(steps, extra) {
  const values = steps.map((s) => s.usd).concat(extra.filter((v) => v != null));
  if (!values.length) return null;
  const price = Math.min(...values);
  const step = steps.find((s) => s.usd === price);
  return { price, t: step ? step.t : null, store: step ? step.store : null };
}

function countSales(steps, base) {
  let n = 0;
  let inSale = false;
  for (const s of steps) {
    const on = s.usd < base - 0.005;
    if (on && !inSale) n++;
    inSale = on;
  }
  return n;
}

export function summarize(state, game, region) {
  const off = officialOffers(state, game.id, region);
  const bestO = cheapest(off);
  const keys = keyOffers(state, game.id);
  const bestK = cheapest(keys);
  const base = refBase(off);
  const steps = (state.history[game.id] && state.history[game.id].official[region]) || [];
  const ggLowRetail = region === "us" && state.ggLow[game.id] ? state.ggLow[game.id].retail : null;

  const out = {
    id: game.id,
    appid: game.appid,
    title: game.title,
    edition: game.edition,
    aliases: game.aliases,
    studio: game.studio,
    publisher: game.publisher,
    genres: game.genres,
    platforms: game.platforms,
    pegi: game.pegi,
    pegiDesc: game.pegiDesc,
    release: game.release,
    upcoming: game.upcoming,
    tagline: game.tagline,
    img: game.img,
    rank: game.rank ?? 0, // Steam chart position (0 = showcase game)
    region,
    base,
    official: bestO ? { price: bestO.usd, store: bestO.store, base, discount: pct(bestO.usd, base), src: bestO.src } : null,
    key: bestK
      ? {
          price: bestK.usd,
          store: bestK.store,
          base: bestK.base,
          src: bestK.src,
          saving: bestO ? Math.max(0, Math.round((1 - bestK.usd / bestO.usd) * 100)) : null,
        }
      : null,
    discount: bestO && base ? pct(bestO.usd, base) : 0,
    low: null,
    isLow: false,
    neverSold: false,
    verdict: null,
    gap: null,
    saleCount: 0,
    updatedAt: Math.max(0, ...off.map((o) => o.at || 0), ...keys.map((o) => o.at || 0)) || null,
    live: off.some((o) => o.src === "live"),
  };

  // Imported (live-only) games have no invented history: their all-time low is only
  // known when gg.deals provides it. Until then we show the lowest price *recorded*.
  const liveOnly = !game.seed;
  out.lowKnown = !liveOnly || ggLowRetail != null;
  out.trackedSince = liveOnly && steps.length ? steps[0].t : null;

  if (bestO && !game.upcoming && !out.lowKnown) {
    out.low = lowOf(steps, [bestO.usd]);
  } else if (bestO && !game.upcoming) {
    const low = lowOf(steps, [bestO.usd, ggLowRetail]);
    out.low = low;
    out.neverSold = low.price >= base - 0.005;
    out.isLow = bestO.usd <= low.price + 0.005 && low.price < base - 0.005;
    out.gap = Math.round((bestO.usd / low.price - 1) * 100);
    out.verdict = out.neverSold ? "new" : out.gap <= 10 ? "buy" : "wait";
    out.saleCount = countSales(
      steps.filter((s) => s.t >= Date.now() - 365 * DAY),
      base
    );
  }
  return out;
}

export function detail(state, game, region) {
  const summary = summarize(state, game, region);
  const url = (store, extra) => storeUrl(store, game, extra);
  const offers = officialOffers(state, game.id, region)
    .sort((a, b) => a.usd - b.usd)
    .map((o) => ({
      store: o.store,
      name: STORES[o.store].name,
      platforms: STORES[o.store].platforms,
      price: o.usd,
      base: o.base,
      discount: pct(o.usd, o.base),
      local: o.localFinal != null ? { amount: o.localFinal / 100, currency: o.cur } : null,
      src: o.src,
      at: o.at,
      url: url(o.store, { url: o.url }),
    }));
  const keys = keyOffers(state, game.id)
    .sort((a, b) => a.usd - b.usd)
    .map((o) => ({
      store: o.store,
      name: STORES[o.store].name,
      price: o.usd,
      base: o.base,
      discount: pct(o.usd, o.base),
      src: o.src,
      at: o.at,
      url: url(o.store, { url: o.url }),
    }));

  // SteamDB-style regional table: the Steam price of every region, converted to USD.
  const usSteam = state.offers[game.id] && state.offers[game.id].steam && state.offers[game.id].steam.prices.us;
  const regions = REGIONS.map((r) => {
    const steam = state.offers[game.id] && state.offers[game.id].steam && state.offers[game.id].steam.prices[r.code];
    const best = cheapest(officialOffers(state, game.id, r.code));
    return {
      code: r.code,
      name: r.name,
      steam: steam
        ? {
            price: steam.usd,
            base: steam.base,
            discount: pct(steam.usd, steam.base),
            local: steam.localFinal != null ? { amount: steam.localFinal / 100, currency: steam.cur } : null,
            vsUs: usSteam && usSteam.usd ? Math.round((steam.usd / usSteam.usd - 1) * 100) : null,
            src: steam.src,
          }
        : null,
      best: best ? { price: best.usd, store: best.store } : null,
    };
  });

  // Edition prices scale with the region's price level (reference prices, not tracked individually).
  const usBase = Math.max(0, ...officialOffers(state, game.id, "us").map((o) => o.base));
  const level = usBase && summary.base ? summary.base / usBase : 1;
  const editions = game.editions ? game.editions.map((e) => ({ id: e.id, name: e.name, perks: e.perks, price: r2(e.base * level) })) : null;

  const h = state.history[game.id] || { official: {}, key: [] };
  return {
    ...summary,
    description: game.description,
    studioCity: game.studioCity,
    hours: game.hours,
    requirements: game.requirements,
    updates: game.updates,
    editions,
    offers,
    keys,
    regions,
    history: { official: h.official[region] || [], key: h.key || [] },
    keyLow: lowOf(h.key || [], [state.ggLow[game.id] ? state.ggLow[game.id].keys : null]),
    links: {
      steamdb: game.appid ? `https://steamdb.info/app/${game.appid}/` : null,
      ggdeals: `https://gg.deals/games/?title=${encodeURIComponent(game.title)}`,
    },
  };
}
