// The price watcher. On a schedule it asks the live sources for fresh prices,
// compares them with what is stored, records every change (history + "price
// changes" feed) and announces it to the browsers through Server-Sent Events.
import { EventEmitter } from "node:events";
import { CATALOG, gameById, isLiveOnly } from "./catalog.js";
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
const STEAM_BATCH = 100; // app ids per Steam request (keeps URLs short and failures small)
const GG_BATCH = 100; // gg.deals: max 100 ids per request and 100 records per minute
const GG_PER_HOUR = 900; // gg.deals allows 1000 records/hour: keep a margin
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

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

  /** Gives games added to the catalog at runtime (weekly import) an empty price record. */
  ensureGames() {
    for (const g of CATALOG)
      if (!this.state.offers[g.id] && isLiveOnly(g)) {
        this.state.offers[g.id] = {};
        this.state.history[g.id] = { official: {}, key: [] };
      }
    this.store.save();
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
    // gg.deals is paced (100 games/minute), so it runs in the background, when due.
    if (config.ggdeals.key) this.maybeRefreshGgDeals();
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
          if (usd != null) ((p.usd = usd), (p.base = base ?? p.base));
        }
  }

  /* ----------------------------------------------------------------- Steam */

  async refreshSteam() {
    const st = this.state.status;
    const games = CATALOG.filter((g) => g.appid && (isLiveOnly(g) || g.seed.offers.some((o) => o.store === "steam")));
    const batches = chunk(games, STEAM_BATCH);
    let ok = 0;
    let failed = 0;
    let lastError = null;
    regions: for (const region of REGIONS) {
      let regionOk = true;
      for (const batch of batches) {
        try {
          const res = await fetchSteamRegion(
            batch.map((g) => g.appid),
            region.steamCc,
            { fetchImpl: this.fetch, delayMs: config.steam.delayMs }
          );
          for (const g of batch) {
            const r = res.get(g.appid);
            if (r && r.status === "ok") this.applySteam(g, region.code, r);
          }
        } catch (err) {
          regionOk = false;
          lastError = err.message + (err.cause && err.cause.code ? ` (${err.cause.code})` : "");
          if (err.rateLimited) {
            failed++;
            break regions; // stop hammering Steam
          }
        }
        await sleep(config.steam.delayMs);
      }
      if (regionOk) ok++;
      else failed++;
    }
    st.steam = {
      enabled: true,
      ok: ok > 0,
      at: Date.now(),
      regionsOk: ok,
      regionsFailed: failed,
      error: ok > 0 && !failed ? null : lastError,
    };
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

    if (!prev && isLiveOnly(game)) {
      // Imported game: its history simply starts with this first real price.
      offers.steam.prices[region] = rec;
      this.syncHistory(game, "official", region);
      return;
    }
    if (!prev || prev.src !== "live") {
      // First live price for this game/region: calibrate the sample data around it.
      const oldBase = prev ? prev.base : base;
      offers.steam.prices[region] = rec;
      this.calibrate(game, region, base, oldBase);
      return;
    }
    const changed = prev.localFinal !== r.final || prev.localBase !== r.initial || prev.cur !== r.currency;
    offers.steam.prices[region] = rec;
    if (changed && Math.abs(prev.usd - usd) >= 0.005)
      this.recordChange(game, { store: "steam", kind: "official", region, from: prev.usd, to: usd, src: "live" });
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
      if (o.kind === "key" && region === "us" && o.price.src === "sample")
        o.price = { ...o.price, usd: r2(o.price.usd * ratio), base: r2(o.price.base * ratio) };
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

  /** Minutes between two full gg.deals passes, so the hourly quota is never exceeded. */
  ggIntervalMinutes(count) {
    return Math.max(config.refreshMinutes, Math.ceil((count / GG_PER_HOUR) * 60));
  }

  maybeRefreshGgDeals() {
    const games = CATALOG.filter((g) => g.appid && !g.upcoming);
    const gg = this.state.status.ggdeals || {};
    // A failed pass (bad key, unconfirmed account, network) is retried at the next Steam check.
    const due = !gg.startedAt || !gg.ok || Date.now() - gg.startedAt >= this.ggIntervalMinutes(games.length) * 60_000 - 5_000;
    if (!this.ggRunning && due) this.ggRunning = this.refreshGgDeals(games).finally(() => (this.ggRunning = null));
    return this.ggRunning;
  }

  /** Fetches gg.deals prices 100 games at a time, one batch per minute (their rate limit). */
  async refreshGgDeals(games = CATALOG.filter((g) => g.appid && !g.upcoming), { pauseMs = 61_000 } = {}) {
    const st = this.state.status;
    const startedAt = Date.now();
    let done = 0;
    try {
      for (const [i, batch] of chunk(games, GG_BATCH).entries()) {
        if (i > 0) await sleep(pauseMs);
        const res = await fetchGgDeals(
          batch.map((g) => g.appid),
          { fetchImpl: this.fetch }
        );
        for (const g of batch) {
          const d = res.get(g.appid);
          if (!d || d.currency !== "USD") continue;
          this.state.ggLow[g.id] = { keys: d.keysLow, retail: d.retailLow };
          if (d.keys != null) this.applyGgKey(g, d);
          this.applyGgRetail(g, d);
        }
        done += batch.length;
        this.store.save();
      }
      st.ggdeals = { enabled: true, ok: true, at: Date.now(), startedAt, games: done, error: null };
    } catch (err) {
      st.ggdeals = { enabled: true, ok: done > 0, at: Date.now(), startedAt, games: done, error: err.message };
    }
    this.emit("status", this.publicStatus());
  }

  /**
   * gg.deals "currentRetail" = cheapest official store (US). Shown as its own official
   * offer only when it beats Steam, otherwise it would just repeat the Steam price.
   */
  applyGgRetail(game, d) {
    const offers = this.state.offers[game.id];
    const prev = offers.ggretail && offers.ggretail.prices.us;
    const steam = offers.steam && offers.steam.prices.us;
    if (d.retail == null || (steam && d.retail >= steam.usd - 0.005)) {
      if (prev) {
        delete offers.ggretail;
        this.syncHistory(game, "official", "us");
      }
      return;
    }
    const base = Math.max(d.retail, steam ? steam.base : 0, prev ? prev.base : 0);
    offers.ggretail = {
      store: "ggretail",
      kind: "official",
      url: d.url,
      prices: { us: { usd: d.retail, base, src: "live", at: Date.now() } },
    };
    if (!prev) this.syncHistory(game, "official", "us");
    else if (Math.abs(prev.usd - d.retail) >= 0.005)
      this.recordChange(game, { store: "ggretail", kind: "official", region: "us", from: prev.usd, to: d.retail, src: "live" });
  }

  applyGgKey(game, d) {
    const offers = this.state.offers[game.id];
    const prev = offers.ggdeals && offers.ggdeals.price;
    const base = Math.max(d.keys, d.retail || 0, ...keyOffers(this.state, game.id).map((o) => o.base));
    offers.ggdeals = { store: "ggdeals", kind: "key", url: d.url, price: { usd: d.keys, base, src: "live", at: Date.now() } };
    // Real keyshop prices now replace the sample keyshops, so rebuild the key history once.
    if (!prev) {
      for (const shop of Object.keys(offers)) if (offers[shop].kind === "key" && shop !== "ggdeals") delete offers[shop];
      if (isLiveOnly(game)) this.syncHistory(game, "key");
      else this.rebuildHistory(game, "key");
      return;
    }
    if (Math.abs(prev.usd - d.keys) >= 0.005)
      this.recordChange(game, { store: "ggdeals", kind: "key", region: null, from: prev.usd, to: d.keys, src: "live" });
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
    if (!g) return null; // game removed from the catalog since the change was recorded
    return {
      ...c,
      title: g.title,
      cover: g.img.coverSm,
      storeName: STORES[c.store].name,
      regionName: c.region ? regionByCode(c.region).name : null,
    };
  }

  /* ------------------------------------------------------------- demo drift */

  /** Demo mode: changes one *sample* price (never a live one) so updates can be watched. */
  driftOnce() {
    const candidates = [];
    for (const g of CATALOG) {
      if (g.upcoming) continue;
      for (const o of Object.values(this.state.offers[g.id] || {})) {
        if (o.kind === "key" && o.price.src !== "live") candidates.push({ g, o });
        if (o.kind === "official")
          for (const r of REGIONS) if (o.prices[r.code] && o.prices[r.code].src !== "live") candidates.push({ g, o, r: r.code });
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
