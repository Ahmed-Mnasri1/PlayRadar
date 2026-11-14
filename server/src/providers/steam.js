// Steam storefront API (public, no key): price_overview for one region.
//   GET /api/appdetails?appids=1,2,3&cc=tr&filters=price_overview
// Prices come back in the *local currency* of the region, in minor units
// (e.g. final: 5999 = 59.99). Several app ids can be batched when the
// `price_overview` filter is used.
import { config } from "../config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, { fetchImpl, timeoutMs }) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctl.signal, headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "PlayRadar-student-project/1.0" } });
    if (res.status === 429) {
      const err = new Error("Steam rate limit (HTTP 429)");
      err.rateLimited = true;
      throw err;
    }
    if (!res.ok) throw new Error(`Steam HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Normalises one entry of the appdetails response. */
export function parseEntry(entry) {
  if (!entry || entry.success !== true) return { status: "unavailable" };
  const po = entry.data && !Array.isArray(entry.data) ? entry.data.price_overview : null;
  if (!po || typeof po.final !== "number") return { status: "none" }; // free, unpriced or not released
  return {
    status: "ok",
    currency: po.currency,
    final: po.final, // minor units
    initial: typeof po.initial === "number" && po.initial >= po.final ? po.initial : po.final,
    discount: po.discount_percent || 0,
  };
}

/**
 * @param {number[]} appids
 * @param {string} cc Steam country code
 * @returns {Promise<Map<number, ReturnType<typeof parseEntry>>>}
 */
export async function fetchSteamRegion(appids, cc, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const base = opts.base || config.steam.base;
  const timeoutMs = opts.timeoutMs || config.steam.timeoutMs;
  const out = new Map();

  const url = (ids) => `${base}/api/appdetails?appids=${ids.join(",")}&cc=${cc}&filters=price_overview`;
  let json = null;
  try {
    json = await getJson(url(appids), { fetchImpl, timeoutMs });
  } catch (err) {
    if (err.rateLimited) throw err;
    /* the batch failed: fall back to one request per app */
  }
  if (json && typeof json === "object") {
    for (const id of appids) if (json[id] !== undefined) out.set(id, parseEntry(json[id]));
  }
  const missing = appids.filter((id) => !out.has(id));
  for (const id of missing) {
    await sleep(opts.delayMs ?? 250);
    const one = await getJson(url([id]), { fetchImpl, timeoutMs }); // throws on network errors
    out.set(id, parseEntry(one && one[id]));
  }
  return out;
}
