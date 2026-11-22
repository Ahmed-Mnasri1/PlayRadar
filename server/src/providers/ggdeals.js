// gg.deals Prices API (optional, needs a free key — https://gg.deals/api/).
// One call returns, for each Steam app id, the best current official ("retail")
// and keyshop prices plus their historical lows, in the currency of the region.
import { config } from "../config.js";

const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** @returns {Promise<Map<number, {keys:number|null, retail:number|null, keysLow:number|null, retailLow:number|null, url:string|null, currency:string}>>} */
export async function fetchGgDeals(appids, opts = {}) {
  const key = opts.key ?? config.ggdeals.key;
  if (!key) throw new Error("gg.deals API key missing");
  const fetchImpl = opts.fetchImpl || fetch;
  const base = opts.base || config.ggdeals.base;
  const out = new Map();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs || config.ggdeals.timeoutMs);
  try {
    const url = `${base}/v1/prices/by-steam-app-id/?ids=${appids.join(",")}&key=${encodeURIComponent(key)}&region=us`;
    const res = await fetchImpl(url, { signal: ctl.signal });
    if (res.status === 429) throw new Error("gg.deals rate limit (HTTP 429)");
    if (!res.ok) {
      // gg.deals explains the problem in the body (e.g. "You need to confirm your email address.")
      const why = await res
        .json()
        .then((j) => j && j.data && j.data.message)
        .catch(() => null);
      throw new Error(`gg.deals HTTP ${res.status}${why ? `: ${why}` : ""}`);
    }
    const json = await res.json();
    if (!json.success) throw new Error("gg.deals API reported an error");
    for (const id of appids) {
      const d = json.data && json.data[id];
      if (!d || !d.prices) continue;
      const p = d.prices;
      out.set(id, {
        keys: num(p.currentKeyshops),
        retail: num(p.currentRetail),
        keysLow: num(p.historicalKeyshops),
        retailLow: num(p.historicalRetail),
        url: d.url || null,
        currency: p.currency || "USD",
      });
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}
