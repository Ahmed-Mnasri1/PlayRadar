// Server-side search: filters, sorting, paging and facet counts over the game
// summaries, so the browser never has to download the whole catalog.

const MAX_PRICE = 110; // the search page's "no limit" value
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]).map(String).filter(Boolean);
const int = (v, d, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const priceOf = (x) => (x ? x.price : 1e9);

export const SORTS = {
  // Steam chart rank; the hand-written showcase games (no rank) come first.
  popular: (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
  price: (a, b) => priceOf(a.official) - priceOf(b.official),
  key: (a, b) => priceOf(a.key) - priceOf(b.key),
  discount: (a, b) => b.discount - a.discount || (a.rank ?? 0) - (b.rank ?? 0),
  date: (a, b) => b.release.localeCompare(a.release),
  // upcoming first by exact date, year-only dates ("2027") last
  release: (a, b) => (a.release.length === 4) - (b.release.length === 4) || a.release.localeCompare(b.release),
};

/** Reads the query string. Unknown or out-of-range values fall back to safe defaults. */
export function parseQuery(q = {}) {
  return {
    q: typeof q.q === "string" ? q.q.trim().slice(0, 80) : "",
    plats: list(q.plat),
    genres: list(q.genre),
    max: int(q.max, MAX_PRICE, 1, MAX_PRICE),
    promo: q.promo === "1",
    low: q.low === "1",
    when: q.when === "out" || q.when === "soon" ? q.when : "all",
    pegi: int(q.pegi, 18, 3, 18),
    sort: Object.hasOwn(SORTS, q.sort) ? q.sort : "popular",
    ids: typeof q.ids === "string" ? q.ids.split(",").filter(Boolean).slice(0, 200) : null,
    offset: int(q.offset, 0, 0, 100_000),
    limit: q.limit == null ? null : int(q.limit, 24, 1, 200),
    facets: q.facets === "1",
  };
}

export const matchesText = (g, nq) => !nq || norm([g.title, g.aliases, g.studio, g.publisher, ...g.genres].join(" ")).includes(nq);

export function runQuery(all, p) {
  const nq = norm(p.q);
  const ids = p.ids && new Set(p.ids);
  const hits = all.filter((g) => {
    if (ids && !ids.has(g.id)) return false;
    if (!matchesText(g, nq)) return false;
    if (p.plats.length && !g.platforms.some((x) => p.plats.includes(x))) return false;
    if (p.genres.length && !g.genres.some((x) => p.genres.includes(x))) return false;
    if (p.max < MAX_PRICE && (!g.official || g.official.price > p.max)) return false;
    if (p.promo && !(g.discount > 0)) return false;
    if (p.low && !g.isLow) return false;
    if (p.when === "out" && g.upcoming) return false;
    if (p.when === "soon" && !g.upcoming) return false;
    if ((g.pegi || 0) > p.pegi) return false;
    return true;
  });
  hits.sort(SORTS[p.sort]);
  const out = {
    total: hits.length,
    offset: p.offset,
    games: p.limit == null ? hits.slice(p.offset) : hits.slice(p.offset, p.offset + p.limit),
  };
  if (p.facets) out.facets = facets(all);
  return out;
}

/** Counts over the whole catalog (what the filter panel lists). */
export function facets(all) {
  const plats = {};
  const genres = {};
  for (const g of all) {
    for (const x of g.platforms) plats[x] = (plats[x] || 0) + 1;
    for (const x of g.genres) genres[x] = (genres[x] || 0) + 1;
  }
  return {
    platforms: Object.entries(plats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    genres: Object.keys(genres).sort(),
  };
}

/** Header suggestions: 5 games + up to 2 studios; hot deals when the box is empty. */
export function suggest(all, q) {
  const nq = norm(String(q || "").trim());
  if (!nq) return { games: all.filter((g) => g.discount >= 30 && !g.upcoming).slice(0, 4), studios: [] };
  const games = all.filter((g) => norm([g.title, g.aliases, g.genres.join(" ")].join(" ")).includes(nq)).sort(SORTS.popular);
  const count = {};
  for (const g of all) if (norm(g.studio).includes(nq)) count[g.studio] = (count[g.studio] || 0) + 1;
  const studios = Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name, n]) => ({ name, count: n }));
  return { games: games.slice(0, 5), studios, total: games.length };
}
