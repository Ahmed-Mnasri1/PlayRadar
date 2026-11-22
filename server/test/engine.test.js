import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.js";
import { Engine } from "../src/engine.js";
import { config } from "../src/config.js";
import { CATALOG, gameById } from "../src/catalog.js";
import { summarize, detail, officialOffers, keyOffers } from "../src/pricing.js";
import { parseEntry } from "../src/providers/steam.js";
import { toUsd, FALLBACK_RATES } from "../src/fx.js";
import { startFakeSteam, tempFile, configureForTests } from "./helpers.js";

const cp = gameById("cyberpunk-2077");

test("parseEntry understands Steam's price_overview shapes", () => {
  assert.deepEqual(
    parseEntry({ success: true, data: { price_overview: { currency: "USD", initial: 5999, final: 2999, discount_percent: 50 } } }),
    { status: "ok", currency: "USD", final: 2999, initial: 5999, discount: 50 }
  );
  assert.equal(parseEntry({ success: true, data: [] }).status, "none"); // unpriced / free
  assert.equal(parseEntry({ success: false }).status, "unavailable");
  assert.equal(parseEntry(undefined).status, "unavailable");
});

test("toUsd converts local currencies", () => {
  assert.equal(toUsd(10, "USD", FALLBACK_RATES), 10);
  assert.equal(toUsd(92, "EUR", { EUR: 0.92 }), 100);
});

test("seed: every released game has regional official prices and one global key price", () => {
  const store = new Store(tempFile());
  for (const g of CATALOG.filter((g) => g.seed && !g.upcoming && g.seed.offers.length)) {
    const us = summarize(store.state, g, "us");
    const tr = summarize(store.state, g, "tr");
    assert.ok(us.official && tr.official, g.id);
    assert.ok(tr.official.price < us.official.price, `${g.id}: Turkey should be cheaper than the US`);
    assert.equal(us.key.price, tr.key.price, `${g.id}: keys cost the same in every region`);
    assert.ok(us.low.price <= us.official.price + 0.001);
  }
  // upcoming game without a price
  assert.equal(summarize(store.state, gameById("kingdom-hearts-iv"), "us").official, null);
});

test("watcher: first live fetch calibrates silently, later changes are announced", async () => {
  const steam = await startFakeSteam();
  configureForTests(steam.base);
  const store = new Store(tempFile());
  const engine = new Engine(store);
  const events = [];
  engine.on("price", (e) => events.push(e));

  await engine.refreshAll("test");
  assert.equal(events.length, 0, "calibration must not spam the feed");
  const us = summarize(store.state, cp, "us");
  assert.equal(us.official.src === "live" || us.official.store !== "steam", true);
  const steamUs = store.state.offers[cp.id].steam.prices.us;
  assert.equal(steamUs.src, "live");
  assert.equal(steamUs.usd, 59.99);
  // Turkey: 59.99 * 25 TRY converted with the fallback rate (41 TRY / USD)
  const steamTr = store.state.offers[cp.id].steam.prices.tr;
  assert.equal(steamTr.cur, "TRY");
  assert.equal(steamTr.usd, toUsd((5999 * 25) / 100, "TRY", FALLBACK_RATES));
  assert.equal(store.state.status.steam.ok, true);
  assert.equal(store.state.status.steam.regionsOk, 9);

  // Same prices again: nothing happens
  await engine.refreshAll("test");
  assert.equal(events.length, 0);

  // Steam drops the US price by 50%
  steam.overrides.set(`us:${cp.appid}`, { initial: 5999, final: 2999 });
  await engine.refreshAll("test");
  assert.equal(events.length, 1);
  const ev = events[0];
  assert.equal(ev.gameId, cp.id);
  assert.equal(ev.store, "steam");
  assert.equal(ev.region, "us");
  assert.equal(ev.from, 59.99);
  assert.equal(ev.to, 29.99);
  assert.equal(ev.pct, -50);
  assert.equal(ev.title, "Cyberpunk 2077");

  const after = summarize(store.state, cp, "us");
  assert.ok(after.official.price <= 29.99);
  assert.ok(after.discount >= 50);
  assert.equal(after.live, true);
  const d = detail(store.state, cp, "us");
  const lastStep = d.history.official.at(-1);
  assert.equal(lastStep.usd, after.official.price, "history gets a new step");
  assert.equal(store.state.changes[0].id, ev.id, "change feed updated");
  // Other regions are untouched
  assert.equal(events.filter((e) => e.region !== "us").length, 0);

  engine.stop();
  await steam.close();
});

test("watcher survives an unreachable Steam and keeps the last known prices", async () => {
  configureForTests("http://127.0.0.1:9"); // nothing listens there
  const store = new Store(tempFile());
  const engine = new Engine(store);
  const before = JSON.stringify(summarize(store.state, cp, "us").official);
  await engine.refreshAll("test");
  assert.equal(store.state.status.steam.ok, false);
  assert.ok(store.state.status.steam.error);
  assert.equal(JSON.stringify(summarize(store.state, cp, "us").official), before);
  engine.stop();
});

test("demo drift only touches sample prices and emits events", () => {
  configureForTests("http://127.0.0.1:9");
  const store = new Store(tempFile());
  const engine = new Engine(store);
  store.state.offers[cp.id].steam.prices.us.src = "live"; // a live price must never drift
  const before = store.state.offers[cp.id].steam.prices.us.usd;
  const seen = [];
  engine.on("price", (e) => seen.push(e));
  for (let i = 0; i < 300; i++) engine.driftOnce();
  assert.ok(seen.length > 20);
  assert.ok(seen.every((e) => e.src === "sample"));
  assert.equal(store.state.offers[cp.id].steam.prices.us.usd, before);
  assert.ok(seen.every((e) => (e.kind === "official" ? e.region : e.region === null)));
  engine.stop();
});

test("keyshops stay global when official prices change in one region", () => {
  const store = new Store(tempFile());
  const engine = new Engine(store);
  const keysBefore = keyOffers(store.state, cp.id).map((k) => k.usd);
  const tr = store.state.offers[cp.id].steam.prices.tr;
  const from = tr.usd;
  tr.usd = 1;
  engine.recordChange(cp, { store: "steam", kind: "official", region: "tr", from, to: 1, src: "sample" });
  assert.deepEqual(
    keyOffers(store.state, cp.id).map((k) => k.usd),
    keysBefore
  );
  assert.equal(
    officialOffers(store.state, cp.id, "tr").some((o) => o.usd === 1),
    true
  );
  assert.equal(summarize(store.state, cp, "tr").official.price, 1);
  assert.notEqual(summarize(store.state, cp, "us").official.price, 1);
  engine.stop();
});

test("imported games are live-only: no sample prices, history starts at the first real price", async (t) => {
  const g = CATALOG.find((x) => !x.seed && !x.upcoming);
  if (!g) return t.skip("no imported catalog (run npm run import:games)");
  const steam = await startFakeSteam();
  configureForTests(steam.base);
  const engine = new Engine(new Store(tempFile()));
  assert.deepEqual(engine.state.offers[g.id], {}, "nothing invented before the first fetch");
  assert.equal(summarize(engine.state, g, "us").official, null);

  await engine.refreshAll("test");
  const us = summarize(engine.state, g, "us");
  assert.equal(us.official.price, 59.99, "price comes from Steam");
  assert.equal(us.official.src, "live");
  assert.equal(us.key, null, "no fake keyshops");
  assert.equal(engine.state.history[g.id].official.us.length, 1, "history starts with one real step");
  assert.equal(us.lowKnown, false);
  assert.equal(us.verdict, null, "no buy/wait claim without a known all-time low");
  assert.equal(us.isLow, false);
  assert.ok(us.trackedSince > 0);

  steam.overrides.set(`us:${g.appid}`, { initial: 5999, final: 2999 });
  await engine.refreshAll("test");
  assert.equal(engine.state.changes[0].gameId, g.id, "a real drop is announced");
  assert.equal(summarize(engine.state, g, "us").low.price, 29.99, "lowest recorded price");

  // gg.deals all-time low makes the verdict possible
  engine.state.ggLow[g.id] = { retail: 19.99, keys: null };
  const withLow = summarize(engine.state, g, "us");
  assert.equal(withLow.lowKnown, true);
  assert.equal(withLow.low.price, 19.99);
  assert.equal(withLow.verdict, "wait");
  engine.stop();
  await steam.close();
});

test("gg.deals: keyshop price, real all-time low and a cheaper retail store (paced batches)", async () => {
  const steam = await startFakeSteam();
  configureForTests(steam.base);
  const g = CATALOG.find((x) => !x.seed && !x.upcoming) || gameById("elden-ring");
  const calls = [];
  // Fake gg.deals: every game has keys at $20, retail at $25 (Steam is $59.99), lows at $15 / $18.
  const fakeFetch = async (url, opts) => {
    if (!String(url).includes("/v1/prices/")) return fetch(url, opts);
    const ids = new URL(url).searchParams.get("ids").split(",");
    calls.push(ids.length);
    const data = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          url: `https://gg.deals/game/${id}/`,
          prices: {
            currentKeyshops: "20.00",
            currentRetail: "25.00",
            historicalKeyshops: "15.00",
            historicalRetail: "18.00",
            currency: "USD",
          },
        },
      ])
    );
    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  };
  const engine = new Engine(new Store(tempFile()), { fetchImpl: fakeFetch });
  await engine.refreshAll("test"); // Steam prices first (no key yet)
  config.ggdeals.key = "test-key";
  try {
    await engine.refreshGgDeals(undefined, { pauseMs: 0 });
  } finally {
    config.ggdeals.key = "";
  }
  assert.ok(
    calls.every((n) => n <= 100),
    "at most 100 ids per request"
  );
  assert.equal(engine.state.status.ggdeals.ok, true);
  const us = summarize(engine.state, g, "us");
  assert.equal(us.key.price, 20, "live keyshop price");
  assert.equal(us.official.price, 25, "cheaper retail store beats Steam");
  assert.equal(us.official.store, "ggretail");
  assert.equal(us.lowKnown, true, "gg.deals gives the real all-time low");
  assert.equal(us.low.price, 18);
  const d = detail(engine.state, g, "us");
  assert.equal(d.offers.find((o) => o.store === "ggretail").url, `https://gg.deals/game/${g.appid}/`);
  assert.equal(summarize(engine.state, g, "tr").official.store, "steam", "retail store is US-only");
  engine.stop();
  await steam.close();
});
