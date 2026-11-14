import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "../src/config.js";

export const CURRENCY = { us: "USD", de: "EUR", gb: "GBP", ca: "CAD", tn: "USD", tr: "TRY", ar: "ARS", br: "BRL", in: "INR" };
const MULT = { USD: 1, EUR: 1, GBP: 0.85, CAD: 1.3, TRY: 25, ARS: 800, BRL: 3.5, INR: 40 };

/** A fake Steam storefront: every app costs 59.99 (x local multiplier), overridable. */
export async function startFakeSteam() {
  const overrides = new Map(); // `${cc}:${appid}` -> { final, initial }
  const calls = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    calls.push(req.url);
    if (url.pathname !== "/api/appdetails") return res.writeHead(404).end();
    const cc = url.searchParams.get("cc");
    const ids = url.searchParams.get("appids").split(",");
    const body = {};
    for (const id of ids) {
      const cur = CURRENCY[cc] || "USD";
      const initial = Math.round(5999 * MULT[cur]);
      const o = overrides.get(`${cc}:${id}`) || {};
      body[id] = { success: true, data: { price_overview: { currency: cur, initial: o.initial ?? initial, final: o.final ?? initial, discount_percent: 0 } } };
      if (id === "3216600" || id === "2439280") body[id] = { success: true, data: [] }; // unpriced games
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(body));
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, overrides, calls, close: () => new Promise((r) => server.close(r)) };
}

export function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "playradar-"));
  return path.join(dir, "state.json");
}

export function configureForTests(steamBase) {
  config.steam.base = steamBase;
  config.steam.delayMs = 0;
  config.steam.enabled = true;
  config.fx.enabled = false; // use the fallback rates: deterministic
  config.ggdeals.key = "";
}
