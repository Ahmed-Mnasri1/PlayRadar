import test from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.js";
import { Engine } from "../src/engine.js";
import { createApp } from "../src/api.js";
import { CATALOG, gameById } from "../src/catalog.js";
import { startFakeSteam, tempFile, configureForTests } from "./helpers.js";

async function boot() {
  const steam = await startFakeSteam();
  configureForTests(steam.base);
  const engine = new Engine(new Store(tempFile()));
  const server = createApp(engine).listen(0);
  await new Promise((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    steam,
    engine,
    server,
    url,
    close: async () => {
      engine.stop();
      server.closeAllConnections?.();
      await new Promise((r) => server.close(r));
      await steam.close();
    },
  };
}

test("REST: meta, games, game detail, regions, 404", async () => {
  const s = await boot();
  const meta = await (await fetch(`${s.url}/api/meta`)).json();
  assert.equal(meta.currency, "USD");
  assert.ok(meta.regions.length >= 8);
  assert.equal(meta.stores.eneba.kind, "key");

  const us = await (await fetch(`${s.url}/api/games?region=us`)).json();
  const tr = await (await fetch(`${s.url}/api/games?region=tr`)).json();
  assert.equal(us.games.length, CATALOG.length, "curated + imported games");
  const a = us.games.find((g) => g.id === "elden-ring");
  const b = tr.games.find((g) => g.id === "elden-ring");
  assert.ok(b.official.price < a.official.price, "regional pricing");
  assert.equal(a.key.price, b.key.price, "global key price");

  const bad = await (await fetch(`${s.url}/api/games?region=xx`)).json();
  assert.equal(bad.region, "us", "unknown region falls back to US");

  const d = await (await fetch(`${s.url}/api/games/gta-v?region=gb`)).json();
  assert.equal(d.region, "gb");
  assert.ok(d.offers.length >= 4 && d.keys.length >= 1 && d.regions.length >= 8);
  assert.ok(d.history.official.length > 3);
  assert.equal((await fetch(`${s.url}/api/games/nope`)).status, 404);
  await s.close();
});

test("SSE: a price change reaches connected browsers", async () => {
  const s = await boot();
  const res = await fetch(`${s.url}/api/events`);
  assert.match(res.headers.get("content-type"), /text\/event-stream/);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const waitFor = async (needle) => {
    const deadline = Date.now() + 5000;
    while (!buf.includes(needle)) {
      if (Date.now() > deadline) throw new Error("timeout waiting for " + needle + " in " + buf);
      const { value } = await reader.read();
      buf += dec.decode(value);
    }
  };
  await waitFor("event: status");
  await s.engine.refreshAll("test"); // calibration
  const g = gameById("baldurs-gate-3");
  s.steam.overrides.set(`de:${g.appid}`, { initial: 5999, final: 3599 });
  await s.engine.refreshAll("test");
  await waitFor("event: price");
  assert.match(buf, /"gameId":"baldurs-gate-3"/);
  assert.match(buf, /"region":"eu"/);
  await reader.cancel();

  const feed = await (await fetch(`${s.url}/api/changes`)).json();
  assert.equal(feed.changes[0].gameId, "baldurs-gate-3");
  assert.equal(feed.changes[0].title, "Baldur's Gate 3");
  await s.close();
});

test("contact form validates and stores messages", async () => {
  const s = await boot();
  const post = (body) =>
    fetch(`${s.url}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const bad = await post({ name: "A", email: "nope", message: "short" });
  assert.equal(bad.status, 422);
  const errs = (await bad.json()).errors;
  assert.ok(errs.name && errs.email && errs.message);
  const ok = await post({ name: "Yessine", email: "y@example.com", subject: "Hi", message: "Great price tracker!" });
  assert.equal(ok.status, 201);
  assert.equal(s.engine.state.contacts[0].name, "Yessine");
  await s.close();
});

test("manual refresh is rate limited", async () => {
  const s = await boot();
  const r1 = await fetch(`${s.url}/api/refresh`, { method: "POST" });
  assert.equal(r1.status, 200);
  const r2 = await fetch(`${s.url}/api/refresh`, { method: "POST" });
  assert.equal(r2.status, 429);
  await s.close();
});

test("wishlist: CRUD per anonymous client, validation, isolation", async () => {
  const s = await boot();
  const call = (method, path, body, client = "test-client-0001") =>
    fetch(`${s.url}/api/wishlist${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Client-Id": client },
      body: body && JSON.stringify(body),
    });

  assert.equal((await fetch(`${s.url}/api/wishlist`)).status, 400, "client id required");

  const first = await (await call("GET", "")).json();
  assert.equal(first.items.length, 4, "new visitors get the demo list");
  assert.deepEqual(first.prefs, { drops: true, releases: true });

  const created = await call("POST", "", { id: "elden-ring", target: 29.999 });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).item.target, 30, "target rounded to cents");
  assert.equal((await call("POST", "", { id: "elden-ring" })).status, 409, "no duplicates");
  assert.equal((await call("POST", "", { id: "nope" })).status, 404, "unknown game");
  assert.equal((await call("POST", "", { id: "stardew-valley", target: -3 })).status, 422, "bad target");

  const patched = await (await call("PATCH", "/elden-ring", { target: null, alert: true })).json();
  assert.deepEqual([patched.item.target, patched.item.alert], [null, true]);
  assert.equal((await call("PATCH", "/elden-ring", { alert: "yes" })).status, 422);
  assert.equal((await call("PATCH", "/stardew-valley", { alert: true })).status, 404);

  assert.equal((await call("PUT", "/prefs", { drops: false, releases: true })).status, 200);
  assert.equal((await call("DELETE", "/elden-ring")).status, 204);
  assert.equal((await call("DELETE", "/elden-ring")).status, 404);

  const after = await (await call("GET", "")).json();
  assert.equal(after.items.length, 4);
  assert.equal(after.prefs.drops, false);
  const other = await (await call("GET", "", undefined, "other-client-02")).json();
  assert.equal(other.prefs.drops, true, "lists are isolated per client");
  await s.close();
});

test("API responses are gzip-compressed, the SSE stream is not", async () => {
  const s = await boot();
  const r = await fetch(`${s.url}/api/games`, { headers: { "Accept-Encoding": "gzip" } });
  assert.equal(r.headers.get("content-encoding"), "gzip");
  const ctrl = new AbortController();
  const e = await fetch(`${s.url}/api/events`, { headers: { "Accept-Encoding": "gzip" }, signal: ctrl.signal });
  assert.equal(e.headers.get("content-encoding"), null);
  ctrl.abort();
  await s.close();
});
