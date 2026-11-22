// "My list" and price alerts, stored server-side.
// There are no accounts: each browser sends an anonymous id (X-Client-Id header,
// a random UUID kept in localStorage) and gets its own list.
import express from "express";
import { gameById } from "./catalog.js";

const CLIENT_ID = /^[A-Za-z0-9-]{8,64}$/;
const MAX_LISTS = 2000; // oldest unused lists are dropped beyond this
const MAX_ITEMS = 100;
const DEFAULT_PREFS = { drops: true, releases: true };
// Local calendar date (YYYY-MM-DD): toISOString() would give yesterday just after midnight east of UTC.
const today = () => new Date().toLocaleDateString("en-CA");

/** A new visitor starts with a small demo list so the page is not empty. */
const defaultItems = () => [
  { id: "no-mans-sky", target: 25, alert: true, added: "2026-09-02" },
  { id: "cyberpunk-2077", target: 30, alert: true, added: "2026-08-14" },
  { id: "gta-v", target: 15, alert: true, added: "2026-10-01" },
  { id: "fable", target: null, alert: true, added: "2026-10-25" },
];

/** Validates a { target, alert } patch. Returns { value } or { error }. */
export function parsePatch(body = {}) {
  const out = {};
  if ("target" in body) {
    const t = body.target;
    if (t === null || t === "") out.target = null;
    else if (typeof t === "number" && Number.isFinite(t) && t >= 0.5 && t <= 10000) out.target = Math.round(t * 100) / 100;
    else return { error: "Target must be a price between $0.50 and $10,000, or null." };
  }
  if ("alert" in body) {
    if (typeof body.alert !== "boolean") return { error: "Alert must be true or false." };
    out.alert = body.alert;
  }
  return { value: out };
}

export function wishlistRouter(engine) {
  const router = express.Router();
  const lists = () => (engine.state.lists ||= {});

  /** Resolves (or creates) the caller's list. */
  router.use((req, res, next) => {
    const id = req.get("X-Client-Id");
    if (!id || !CLIENT_ID.test(id)) return res.status(400).json({ error: "Missing or invalid X-Client-Id header." });
    const all = lists();
    if (!all[id]) {
      const ids = Object.keys(all);
      if (ids.length >= MAX_LISTS) delete all[ids.reduce((a, b) => (all[a].seen <= all[b].seen ? a : b))];
      all[id] = { items: defaultItems(), prefs: { ...DEFAULT_PREFS }, seen: Date.now() };
    }
    all[id].seen = Date.now();
    req.list = all[id];
    next();
  });

  const save = () => engine.store.save();

  router.get("/", (req, res) => res.json({ items: req.list.items, prefs: req.list.prefs }));

  router.post("/", (req, res) => {
    const id = req.body?.id;
    if (typeof id !== "string" || !gameById(id)) return res.status(404).json({ error: "Unknown game." });
    if (req.list.items.some((w) => w.id === id)) return res.status(409).json({ error: "This game is already in your list." });
    if (req.list.items.length >= MAX_ITEMS) return res.status(422).json({ error: `Your list is limited to ${MAX_ITEMS} games.` });
    const { value, error } = parsePatch(req.body);
    if (error) return res.status(422).json({ error });
    const item = { id, target: null, alert: false, added: today(), ...value };
    req.list.items.unshift(item);
    save();
    res.status(201).json({ item });
  });

  router.put("/prefs", (req, res) => {
    const b = req.body || {};
    if (typeof b.drops !== "boolean" || typeof b.releases !== "boolean")
      return res.status(422).json({ error: "drops and releases must be true or false." });
    req.list.prefs = { drops: b.drops, releases: b.releases };
    save();
    res.json({ prefs: req.list.prefs });
  });

  router.patch("/:id", (req, res) => {
    const item = req.list.items.find((w) => w.id === req.params.id);
    if (!item) return res.status(404).json({ error: "This game is not in your list." });
    const { value, error } = parsePatch(req.body);
    if (error) return res.status(422).json({ error });
    Object.assign(item, value);
    save();
    res.json({ item });
  });

  router.delete("/:id", (req, res) => {
    const before = req.list.items.length;
    req.list.items = req.list.items.filter((w) => w.id !== req.params.id);
    if (req.list.items.length === before) return res.status(404).json({ error: "This game is not in your list." });
    save();
    res.status(204).end();
  });

  return router;
}
