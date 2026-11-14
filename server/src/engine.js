// The price watcher. On a schedule it asks the live sources for fresh prices,
// compares them with what is stored, records every change (history + "price
// changes" feed) and announces it to the browsers through Server-Sent Events.
import { EventEmitter } from "node:events";
import { CATALOG, gameById } from "./catalog.js";
import { REGIONS, regionByCode } from "./regions.js";
import { STORES } from "./stores.js";
import { config } from "./config.js";
import { fetchSteamRegion } from "./providers/steam.js";
import { fetchGgDeals } from "./providers/ggdeals.js";
import { fetchRates, needsRefresh, toUsd } from "./fx.js";
import { cheapest, officialOffers, keyOffers, summarize, refBase } from "./pricing.js";
import { buildSteps, saleWindows, r2 } from "./seed.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_CHANGES = 300;

export class Engine extends EventEmitter {
  constructor(store, { fetchImpl = fetch } = {}) {
    super();
    this.store = store;
    this.fetch = fetchImpl;
    this.running = null;
    this.timer = null;
    this.driftTimer = null;
    this.seq = Math.max(0, ...store.state.changes.map((c) => c.id || 0));
    this.rand = Math.random;
  }

  get state() {
    return this.store.state;
  }

  /* ------------------------------------------------------------ scheduling */

  start() {
    this.schedule(2000);
    if (config.demo.enabled) {
      console.log(`[engine] demo mode: sample prices drift every ${config.demo.everySeconds}s`);
      this.driftTimer = setInterval(() => this.driftOnce(), config.demo.everySeconds * 1000);
      this.driftTimer.unref?.();
    }
  }

  stop() {
    clearTimeout(this.timer);
    clearInterval(this.driftTimer);
  }

  schedule(ms) {
    clearTimeout(this.timer);
    this.state.status.nextRun = Date.now() + ms;
    this.timer = setTimeout(async () => {
      try {
        await this.refreshAll("schedule");
      } catch (err) {
        console.warn("[engine] refresh failed:", err.message);
      }
      this.schedule(config.refreshMinutes * 60_000);
    }, ms);
    this.timer.unref?.();
  }

  /** Runs one full refresh (concurrent calls share the same run). */
  refreshAll(reason = "manual") {
    if (this.running) return this.running;
    this.running = this._refresh(reason).finally(() => (this.running = null));
    return this.running;
  }

  async _refresh(reason) {
    const st = this.state.status;
    st.lastRun = Date.now();
    st.runs++;
    st.running = true;
    this.emit("status", this.publicStatus());
    await this.refreshFx();
    if (config.steam.enabled) await this.refreshSteam();
    else st.steam = { enabled: false, ok: null, at: Date.now(), error: "disabled (STEAM_LIVE=0)" };
    if (config.ggdeals.key) await this.refreshGgDeals();
    else st.ggdeals = { enabled: false, ok: null, at: null, error: "no API key (optional)" };
    st.running = false;
    st.lastOk = st.steam.ok || (st.ggdeals && st.ggdeals.ok) ? Date.now() : st.lastOk;
    this.store.save();
    this.emit("status", this.publicStatus());
    return { reason, status: this.publicStatus() };
  }

  publicStatus() {
    const s = this.state.status;
    return {
      lastRun: s.lastRun,
      lastOk: s.lastOk,
      nextRun: s.nextRun,
      running: !!s.running,
      intervalMinutes: config.refreshMinutes,
      demo: config.demo.enabled,
      sources: {
        steam: { ...s.steam },
        ggdeals: { ...s.ggdeals },
        fx: { ...s.fx, updatedAt: this.state.fx.updatedAt, source: this.state.fx.source },
      },
    };
  }

  /* -------------------------------------------------------------- exchange */

  async refreshFx() {
    const st = this.state.status;
    if (!config.fx.enabled) return void (st.fx = { ok: null, error: "disabled (FX_LIVE=0)" });
    if (!needsRefresh(this.state.fx)) return;
    try {
      this.state.fx = await fetchRates(this.fetch);
      st.fx = { ok: true, error: null };
      this.recomputeUsd();
    } catch (err) {
      st.fx = { ok: false, error: err.message };
    }
  }

  /** New exchange rates change the USD value of live prices, not the prices themselves. */
  recomputeUsd() {
    for (const offers of Object.values(this.state.offers))
      for (const o of Object.values(offers))
        for (const p of o.kind === "official" ? Object.values(o.prices) : []) {
          if (p.src !== "live" || p.localFinal == null) continue;
          const usd = toUsd(p.localFinal / 100, p.cur, this.state.fx.rates);
          const base = toUsd(p.localBase / 100, p.cur, this.state.fx.rates);
          if (usd != null) (p.usd = usd), (p.base = base ?? p.base);
        }
  }

  /* ----------------------------------------------------------------- Steam */

  async refreshSteam() {
    const st = this.state.status;
    const games = CATALOG.filter((g) => g.appid && g.seed.offers.some((o) => o.store === "steam"));
    const appids = games.map((g) => g.appid);
    let ok = 0;
    let failed = 0;
    let lastError = null;
    for (const region of REGIONS) {
      try {
        const res = await fetchSteamRegion(appids, region.steamCc, { fetchImpl: this.fetch, delayMs: config.steam.delayMs });
        for (const g of games) {
          const r = res.get(g.appid);
          if (r && r.status === "ok") this.applySteam(g, region.code, r);
        }
        ok++;
      } catch (err) {
        failed++;
        lastError = err.message + (err.cause && err.cause.code ? ` (${err.cause.code})` : "");
        if (err.rateLimited) break; // stop hammering Steam
      }
      await sleep(config.steam.delayMs);
    }
    st.steam = { enabled: true, ok: ok > 0, at: Date.now(), regionsOk: ok, regionsFailed: failed, error: ok > 0 && !failed ? null : lastError };
    this.store.save();
  }

  applySteam(game, region, r) {
    const offers = this.state.offers[game.id];
    if (!offers.steam) offers.steam = { store: "steam", kind: "official", prices: {} };
    const prev = offers.steam.prices[region];
    const rates = this.state.fx.rates;
    const usd = toUsd(r.final / 100, r.currency, rates);
    const base = toUsd(r.initial / 100, r.currency, rates);
    if (usd == null) return; // unknown currency: keep the previous price
    const rec = { usd, base, src: "live", at: Date.now(), cur: r.currency, localFinal: r.final, localBase: r.initial };

    if (!prev || prev.src !== "live") {
      // First live price for this game/region: calibrate the sample data around it.
      const oldBase = prev ? prev.base : base;
      offers.steam.prices[region] = rec;
      this.calibrate(game, region, base, oldBase);
      return;
    }
    const changed = prev.localFinal !== r.final || prev.localBase !== r.initial || prev.cur !== r.currency;
    offers.steam.prices[region] = rec;
    if (changed && Math.abs(prev.usd - usd) >= 0.005) this.recordChange(game, { store: "steam", kind: "official", region, from: prev.usd, to: usd, src: "live" });
    else if (changed) this.syncHistory(game, "official", region);
  }

  /** Re-anchors sample offers and the seeded history on a freshly measured live price. */
  calibrate(game, region, liveBase, oldSteamBase) {
    const offers = this.state.offers[game.id];
    const ratio = oldSteamBase > 0 ? liveBase / oldSteamBase : 1;
    for (const o of Object.values(offers)) {
      if (o.kind === "official" && o.store !== "steam" && o.prices[region] && o.prices[region].src === "sample") {
        const p = o.prices[region];
        o.prices[region] = { ...p, usd: r2(p.usd * ratio), base: r2(p.base * ratio) };
      }
      if (o.kind === "key" && region === "us" && o.price.src === "sample") o.price = { ...o.price, usd: r2(o.price.usd * ratio), base: r2(o.price.base * ratio) };
    }
    this.rebuildHistory(game, region);
    if (region === "us") this.rebuildHistory(game, "key");
    this.state.calibrated[`${game.id}|${region}`] = true;
  }

  rebuildHistory(game, which) {
    if (game.upcoming) return;
    const now = Date.now();
    const windows = saleWindows(game, now);
    const h = this.state.history[game.id] || (this.state.history[game.id] = { official: {}, key: [] });
    if (which === "key") {
      const best = cheapest(keyOffers(this.state, game.id));
      if (!best) return;
      const base = Math.max(...keyOffers(this.state, game.id).map((o) => o.base));
      h.key = buildSteps({ game, base, current: best.usd, currentStore: best.store, windows, now, deeper: 1.15, store: best.store });
      return;
    }
    const list = officialOffers(this.state, game.id, which);
    const best = cheapest(list);
    if (!best) return;
    h.official[which] = buildSteps({ game, base: refBase(list), current: best.usd, currentStore: best.store, windows, now });
  }

  /* --------------------------------------------------------------- gg.deals */

  async refreshGgDeals() {
    const st = this.state.status;
    const games = CATALOG.filter((g) => g.appid && !g.upcoming);
    try {
      const res = await fetchGgDeals(games.map((g) => g.appid), { fetchImpl: this.fetch });
      for (const g of games) {
        const d = res.get(g.appid);
        if (!d || d.currency !== "USD") continue;
        this.state.ggLow[g.id] = { keys: d.keysLow, retail: d.retailLow };
        if (d.keys != null) this.applyGgKey(g, d);
      }
      st.ggdeals = { enabled: true, ok: true, at: Date.now(), error: null };
    } catch (err) {
      st.ggdeals = { enabled: true, ok: false, at: Date.now(), error: err.message };
    }
  }

  applyGgKey(game, d) {
    const offers = this.state.offers[game.id];
    const prev = offers.ggdeals && offers.ggdeals.price;
    const base = Math.max(d.keys, d.retail || 0, ...keyOffers(this.state, game.id).map((o) => o.base));
    offers.ggdeals = { store: "ggdeals", kind: "key", url: d.url, price: { usd: d.keys, base, src: "live", at: Date.now() } };
    // Real keyshop prices now replace the sample keyshops, so rebuild the key history once.
    if (!prev) {
      for (const shop of Object.keys(offers)) if (offers[shop].kind === "key" && shop !== "ggdeals") delete offers[shop];
      this.rebuildHistory(game, "key");
      return;
    }
    if (Math.abs(prev.usd - d.keys) >= 0.005) this.recordChange(game, { store: "ggdeals", kind: "key", region: null, from: prev.usd, to: d.keys, src: "live" });
  }

  /* --------------------------------------------------- history + change feed */

  /** Appends a step to the best-price history when the best price/store changed. */
  syncHistory(game, kind, region) {
    const h = this.state.history[game.id] || (this.state.history[game.id] = { official: {}, key: [] });
    const best = kind === "key" ? cheapest(keyOffers(this.state, game.id)) : cheapest(officialOffers(this.state, game.id, region));
    if (!best) return;
    const steps = kind === "key" ? h.key : h.official[region] || (h.official[region] = []);
    const last = steps[steps.length - 1];
    if (!last || last.usd !== best.usd || last.store !== best.store) steps.push({ t: Date.now(), usd: best.usd, store: best.store });
  }

  recordChange(game, { store, kind, region, from, to, src }) {
    this.syncHistory(game, kind, region);
    const entry = {
      id: ++this.seq,
      t: Date.now(),
      gameId: game.id,
      store,
      kind,
      region,
      from,
      to,
      pct: from ? Math.round((to / from - 1) * 100) : 0,
      src,
    };
    this.state.changes.unshift(entry);
    this.state.changes.length = Math.min(this.state.changes.length, MAX_CHANGES);
    this.store.save();
    this.emit("price", this.enrich(entry));
    return entry;
  }

  enrich(c) {
    const g = gameById(c.gameId);
    return { ...c, title: g.title, cover: g.img.cover, storeName: STORES[c.store].name, regionName: c.region ? regionByCode(c.region).name : null };
  }

  /* ------------------------------------------------------------- demo drift */

  /** Demo mode: changes one *sample* price (never a live one) so updates can be watched. */
  driftOnce() {
    const candidates = [];
    for (const g of CATALOG) {
      if (g.upcoming) continue;
      for (const o of Object.values(this.state.offers[g.id] || {})) {
        if (o.kind === "key" && o.price.src !== "live") candidates.push({ g, o });
        if (o.kind === "official") for (const r of REGIONS) if (o.prices[r.code] && o.prices[r.code].src !== "live") candidates.push({ g, o, r: r.code });
      }
    }
    if (!candidates.length) return null;
    const { g, o, r } = candidates[Math.floor(this.rand() * candidates.length)];
    const rec = o.kind === "key" ? o.price : o.prices[r];
    const onSale = rec.usd < rec.base * 0.99;
    const steps = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6];
    let off = steps[Math.floor(this.rand() * steps.length)];
    if (onSale && this.rand() < 0.4) off = 0;
    const next = r2(rec.base * (1 - off));
    if (Math.abs(next - rec.usd) < 0.005) return null;
    const from = rec.usd;
    Object.assign(rec, { usd: next, at: Date.now() });
    return this.recordChange(g, { store: o.store, kind: o.kind, region: o.kind === "key" ? null : r, from, to: next, src: "sample" });
  }

  /** Immediate "best price" snapshot used by the API and by tests. */
  bestNow(gameId, region) {
    return summarize(this.state, gameById(gameId), region);
  }
}
