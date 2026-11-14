import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.js";
import { Engine } from "../src/engine.js";
import { CATALOG, gameById } from "../src/catalog.js";
import { summarize, detail, officialOffers, keyOffers } from "../src/pricing.js";
import { parseEntry } from "../src/providers/steam.js";
import { toUsd, FALLBACK_RATES } from "../src/fx.js";
import { startFakeSteam, tempFile, configureForTests } from "./helpers.js";

const cp = gameById("cyberpunk-2077");

test("parseEntry understands Steam's price_overview shapes", () => {
  assert.deepEqual(parseEntry({ success: true, data: { price_overview: { currency: "USD", initial: 5999, final: 2999, discount_percent: 50 } } }), { status: "ok", currency: "USD", final: 2999, initial: 5999, discount: 50 });
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
  for (const g of CATALOG.filter((g) => !g.upcoming && g.seed.offers.length)) {
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
  assert.equal(steamTr.usd, toUsd(5999 * 25 / 100, "TRY", FALLBACK_RATES));
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
  assert.ok(seen.every((e) => e.kind === "official" ? e.region : e.region === null));
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
  assert.deepEqual(keyOffers(store.state, cp.id).map((k) => k.usd), keysBefore);
  assert.equal(officialOffers(store.state, cp.id, "tr").some((o) => o.usd === 1), true);
  assert.equal(summarize(store.state, cp, "tr").official.price, 1);
  assert.notEqual(summarize(store.state, cp, "us").official.price, 1);
  engine.stop();
});
