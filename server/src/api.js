import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { CATALOG, gameById } from "./catalog.js";
import { REGIONS, REGION_CODES, DEFAULT_REGION } from "./regions.js";
import { STORES } from "./stores.js";
import { summarize, detail } from "./pricing.js";

const isRegion = (r) => REGION_CODES.includes(r);
const regionOf = (req) => (isRegion(req.query.region) ? req.query.region : DEFAULT_REGION);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function createApp(engine) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json({ limit: "20kb" }));

  /* ------------------------------------------------------------- reference */
  app.get("/api/health", (_req, res) => res.json({ ok: true, time: Date.now() }));

  app.get("/api/meta", (_req, res) => {
    res.json({
      currency: "USD",
      defaultRegion: DEFAULT_REGION,
      regions: REGIONS.map(({ code, name }) => ({ code, name })),
      stores: Object.fromEntries(Object.entries(STORES).map(([id, s]) => [id, { name: s.name, short: s.short, kind: s.kind, tint: s.tint, platforms: s.platforms, live: !!s.live }])),
      games: CATALOG.length,
      status: engine.publicStatus(),
    });
  });

  /* ----------------------------------------------------------------- games */
  app.get("/api/games", (req, res) => {
    const region = regionOf(req);
    res.json({ region, updatedAt: Date.now(), games: CATALOG.map((g) => summarize(engine.state, g, region)) });
  });

  app.get("/api/games/:id", (req, res) => {
    const game = gameById(req.params.id);
    if (!game) return res.status(404).json({ error: "Game not found" });
    res.json(detail(engine.state, game, regionOf(req)));
  });

  /* --------------------------------------------------------- price changes */
  app.get("/api/changes", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const kind = req.query.kind === "official" || req.query.kind === "key" ? req.query.kind : null;
    const region = isRegion(req.query.region) ? req.query.region : null;
    const list = engine.state.changes
      .filter((c) => (!kind || c.kind === kind) && (!region || c.kind === "key" || c.region === region))
      .slice(0, limit)
      .map((c) => engine.enrich(c));
    res.json({ changes: list });
  });

  /* ------------------------------------------------ live updates (SSE) */
  app.get("/api/events", (req, res) => {
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders?.();
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    res.write("retry: 3000\n\n");
    send("status", engine.publicStatus());
    const onPrice = (c) => send("price", c);
    const onStatus = (s) => send("status", s);
    engine.on("price", onPrice);
    engine.on("status", onStatus);
    const beat = setInterval(() => res.write(": ping\n\n"), 25_000);
    req.on("close", () => {
      clearInterval(beat);
      engine.off("price", onPrice);
      engine.off("status", onStatus);
    });
  });

  /** "Check now" button: forces a refresh (rate limited). */
  let lastManual = 0;
  app.post("/api/refresh", async (_req, res) => {
    const wait = config.manualRefreshCooldownSec * 1000 - (Date.now() - lastManual);
    if (wait > 0 && !engine.running) return res.status(429).json({ error: "Please wait before checking again", retryInSeconds: Math.ceil(wait / 1000) });
    lastManual = Date.now();
    try {
      const out = await engine.refreshAll("manual");
      res.json({ ok: true, status: out.status });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  /* --------------------------------------------------------------- contact */
  const hits = new Map();
  app.post("/api/contact", (req, res) => {
    const ip = req.ip || "local";
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
    if (recent.length >= 5) return res.status(429).json({ error: "Too many messages, please try again in a minute." });
    const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const msg = { name: clean(req.body.name, 80), email: clean(req.body.email, 120), subject: clean(req.body.subject, 120), message: clean(req.body.message, 2000) };
    const errors = {};
    if (msg.name.length < 2) errors.name = "Please enter your name.";
    if (!EMAIL.test(msg.email)) errors.email = "Please enter a valid email address.";
    if (msg.message.length < 10) errors.message = "Your message should be at least 10 characters.";
    if (Object.keys(errors).length) return res.status(422).json({ error: "Please fix the highlighted fields.", errors });
    hits.set(ip, [...recent, now]);
    engine.state.contacts.unshift({ ...msg, at: now });
    engine.state.contacts.length = Math.min(engine.state.contacts.length, 200);
    engine.store.save();
    res.status(201).json({ ok: true });
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Unknown API route" }));

  /* ----------------------- built front-end (production: npm start) */
  if (fs.existsSync(path.join(config.clientDist, "index.html"))) {
    app.use(express.static(config.clientDist, { maxAge: "1h", index: false }));
    app.get("*", (_req, res) => res.sendFile(path.join(config.clientDist, "index.html")));
  }
  return app;
}
