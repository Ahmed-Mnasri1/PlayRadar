// Exchange rates (units of currency per 1 USD). Steam returns prices in the
// local currency of each region; the site displays everything in US dollars.
import { config } from "./config.js";

// Indicative fallback used when the live endpoint is unreachable.
export const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  TRY: 41,
  ARS: 1050,
  BRL: 5.5,
  INR: 85,
  TND: 3.1,
};

export function needsRefresh(fx, now = Date.now()) {
  return !fx || !fx.updatedAt || now - fx.updatedAt > config.fx.maxAgeHours * 3600_000;
}

/** Fetch live rates. Returns { rates, updatedAt, source } or throws. */
export async function fetchRates(fetchImpl = fetch) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const res = await fetchImpl(config.fx.url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = await res.json();
    if (json.result && json.result !== "success") throw new Error("FX API error");
    const rates = json.rates || json.conversion_rates;
    if (!rates || !rates.EUR) throw new Error("FX response has no rates");
    return { rates: { ...rates, USD: 1 }, updatedAt: Date.now(), source: "live" };
  } finally {
    clearTimeout(timer);
  }
}

export function toUsd(amount, currency, rates) {
  const r = currency === "USD" ? 1 : rates[currency] || FALLBACK_RATES[currency];
  if (!r) return null;
  return Math.round((amount / r) * 100) / 100;
}
