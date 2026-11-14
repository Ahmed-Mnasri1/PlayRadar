# PlayRadar — video game price comparison

Projet Web · SUP'COM 2026–2027 · Groupe 9 · **Objectif 3 — Développement et intégration des fonctionnalités principales**

PlayRadar compares video game prices across **official stores** (prices depend on the buyer's **region**) and **key shops** (one **global** price, whatever the region). Everything is displayed in **US dollars**, and prices update **automatically** while you watch. The UI is in English. Inspired by [SteamDB](https://steamdb.info/) (regional prices, price history, price-change feed) and [gg.deals](https://gg.deals/) (official stores vs. keyshops, historical lows, verdict).

## 1. Choice of framework

| Layer | Choice | Why |
|---|---|---|
| Front-end | **React 18 + Vite + React Router** | Component model matches the prototype (header, game card, price table, chart…); hooks + Context for state; fast dev server. |
| Back-end | **Node.js + Express** (minimal REST API + Server-Sent Events) | Same language as the front-end, tiny footprint. Data persisted in a JSON file (`server/data/state.json`), so no database to install. |
| Style | The Objectif 2 design tokens and CSS, reused as-is (`client/src/styles`) | Visual fidelity to the validated prototype. |
| Tests | `node:test` (built in) | Zero extra dependency. |

## 2. Features

* **5+ dynamic pages**: Home `/`, Search & filters `/browse`, Game `/game/:id`, My list & alerts `/wishlist`, Live price changes `/changes`, plus Contact `/contact`.
* **Regional pricing**: region selector in the header (9 regions). Official store prices follow the region; **key shop prices do not change** with it.
* **USD everywhere**: Steam returns local currencies (TRY, ARS, EUR…); the server converts them to USD with live exchange rates (fallback table if offline).
* **Automatic price updates** (the core feature):
  1. A *price watcher* in the back-end polls the **Steam store API** for every game in every region (default every 10 min, `REFRESH_MINUTES`).
  2. It compares with what it stored; every real change is recorded in the **price history** and in the **price-changes feed**.
  3. The change is pushed to every open browser through **Server-Sent Events** (`/api/events`): prices, charts, deal lists and badges refresh without reloading, and a toast appears. A 60-second polling is a safety net.
* **SteamDB-style** regional price table + 12-month history chart (official vs. key price, all-time low line, average, sales count).
* **gg.deals-style** comparison: official stores table, key shops table, "keys from $X", verdict (good deal / better to wait / never on sale).
* **Search**: instant suggestions (`/` shortcut), filters (platform, genre, max price, on sale, all-time low, release, PEGI), sort, grid/list view, state kept in the URL.
* **My list & price alerts**: target price per game (stored in the browser); an in-page alert fires when a live price crosses your target.
* **Forms with validation** (client + server): search, alert dialog, contact (`POST /api/contact`).
* Responsive (mobile tab bar, filter drawer), semantic HTML, skip link, visible focus, reduced-motion support.

## 3. Data sources — what is live and what is sample (please read)

| Data | Source | Status |
|---|---|---|
| Steam prices, 9 regions | Steam public storefront API (`appdetails?filters=price_overview`) | **Live** (marked with a green dot) |
| Exchange rates | open.er-api.com | **Live** (fallback table if unreachable) |
| Key shop prices | [gg.deals Prices API](https://gg.deals/api/prices/) | **Live if** you set `GGDEALS_API_KEY` (free key); otherwise **sample** |
| Epic, GOG, PSN, Xbox, Nintendo, Rockstar prices; individual key shops | no free public API | **Sample** (hollow dot). Plug a provider in `server/src/providers/` |
| Game info, covers, news, requirements | Steam snapshot of 7 Nov 2026 (translated to English) | Static |
| History before the first live check | deterministic simulation | Illustrative; real changes are recorded from then on |

On the first successful Steam answer for a game/region, the sample data of that region is **re-calibrated** around the real price (no fake "price change" is announced).
If Steam cannot be reached, the site keeps the last known prices and the header pill shows "Sample data".

**Demo mode** (`npm run demo`): only *sample* prices drift randomly every ~12 s so you can watch live updates during a presentation. Live prices are never touched.

## 4. Run the project

Requirements: **Node.js ≥ 20.12** and npm.

```bash
npm install          # installs server + client (npm workspaces)
npm run dev          # API on :3001 + React dev server on http://localhost:5173
```

Other commands:

```bash
npm run demo         # same as dev, with drifting sample prices (for demos)
npm start            # production: builds the client, serves everything on http://localhost:3001
npm test             # back-end tests (parser, watcher, SSE, API, forms)
```

Optional configuration: copy `server/.env.example` to `server/.env` (port, refresh interval, `GGDEALS_API_KEY`, `STEAM_LIVE=0` to work offline).

## 5. Project structure

```
server/
  src/index.js          entry point
  src/api.js            REST routes + SSE (/api/events)
  src/engine.js         price watcher: poll, diff, history, change feed, demo drift
  src/pricing.js        read-only logic: best price, all-time low, verdict, regional table
  src/providers/        steam.js (live), ggdeals.js (optional live)
  src/seed.js, store.js initial data + JSON persistence
  src/catalog.json      game metadata (English)
  test/                 node:test suites (fake Steam server included)
client/
  src/pages/            Home, Browse, Game, Wishlist, Changes, Contact
  src/components/       ui.jsx (header, cards, badges…), charts.jsx, AlertDialog.jsx
  src/context.jsx       global state: region, games, SSE connection, wishlist, toasts
  src/styles/           design tokens + CSS from the Objectif 2 prototype
```

### REST API

`GET /api/meta` · `GET /api/games?region=us` · `GET /api/games/:id?region=tr` · `GET /api/changes?kind=official|key&region=` · `GET /api/events` (SSE) · `POST /api/refresh` ("Check now", rate limited) · `POST /api/contact`

## 6. Known limits / next steps

* Only Steam (and optionally gg.deals) are live; other stores need their own provider.
* Steam regional prices are for comparison: you can only buy at the price of your own account's region.
* Wishlist is stored in the browser (no accounts); e-mail alerts are out of scope (alerts appear in the page).
* Covers are the Steam snapshot taken for the prototype; the GTA V cover carries French text.
* Games are a fixed catalog of 14 titles (`catalog.json`); adding a game = adding an entry (with its Steam app id).
