# PlayRadar — video game price comparison

Projet Web · SUP'COM 2026–2027 · **Groupe 9** — Ahmed Mnasri and Yessine Rekik

PlayRadar compares video game prices across **official stores** (prices depend on the buyer's **region**) and **key shops** (one **global** price, whatever the region). Everything is displayed in **US dollars**, and prices update **automatically** while you watch. The UI is in English. Inspired by [SteamDB](https://steamdb.info/) (regional prices, price history, price-change feed) and [gg.deals](https://gg.deals/) (official stores vs. keyshops, historical lows, verdict).

The repository holds the web application (`client/` + `server/`), the clickable design prototype it was built from (`prototype/`) and the presentation deck (`presentation/`).

## 1. Technologies

| Layer | Choice | Why |
|---|---|---|
| Front-end | **React 18 + Vite + React Router** | Component model matches the prototype (header, game card, price table, chart…); hooks + Context for state; fast dev server. |
| Back-end | **Node.js + Express** (minimal REST API + Server-Sent Events) | Same language as the front-end, tiny footprint. Data persisted in a JSON file (`server/data/state.json`), so no database to install. |
| Style | The prototype's design tokens and CSS, reused as-is (`client/src/styles`) | Visual fidelity to the validated prototype. |
| Tests | `node:test` (built in) for the server, **Vitest + Testing Library** for the client | Zero extra dependency on the server; Vitest shares the Vite config. |
| Code quality | ESLint (recommended + React + hooks rules) and Prettier | Same rules for client and server. |

## 2. Features

* **5+ dynamic pages**: Home `/`, Search & filters `/browse`, Game `/game/:id`, My list & alerts `/wishlist`, Live price changes `/changes`, plus Contact `/contact`.
* **Catalog of 514 games** imported from Steam's charts and refreshed weekly (see §6), plus 14 showcase games with full details.
* **Regional pricing**: region selector in the header (9 regions). Official store prices follow the region; **key shop prices do not change** with it.
* **USD everywhere**: Steam returns local currencies (TRY, ARS, EUR…); the server converts them to USD with live exchange rates (fallback table if offline).
* **Automatic price updates** (the core feature):
  1. A *price watcher* in the back-end polls the **Steam store API** for every game in every region (default every 10 min, `REFRESH_MINUTES`).
  2. It compares with what it stored; every real change is recorded in the **price history** and in the **price-changes feed**.
  3. The change is pushed to every open browser through **Server-Sent Events** (`/api/events`): prices, charts, deal lists and badges refresh without reloading, and a toast appears. A 60-second polling is a safety net.
* **SteamDB-style** regional price table + 12-month history chart (official vs. key price, all-time low line, average, sales count).
* **gg.deals-style** comparison: official stores table, key shops table, "keys from $X", verdict (good deal / better to wait / never on sale). gg.deals' cheapest official store is shown as *Best retail store* when it beats Steam.
* **Search**: instant suggestions (`/` shortcut, ARIA combobox with ↑/↓/Enter/Esc), filters (platform, genre, max price, on sale, all-time low, release, PEGI), sort (Steam popularity by default), grid/list view, state kept in the URL. Search and paging run on the server, so the browser never downloads the whole catalog.
* **My list & price alerts**: target price per game, saved **on the server** (REST CRUD, see below) for each browser; an in-page alert fires when a live price crosses your target, and another when a game from your list opens pre-orders or is released (both can be switched off in *Alert preferences*). The UI updates optimistically and re-syncs with the server on failure.
* **Forms with validation** (client + server): search, alert dialog, contact (`POST /api/contact`).
* Responsive (mobile tab bar, filter drawer), semantic HTML, skip link, visible focus, reduced-motion support.
* Loading skeletons on every page, spinners on buttons, retryable error states, light page transitions; pages lazy-loaded, each behind an error boundary.

## 3. Data sources — what is live and what is sample (please read)

| Data | Source | Status |
|---|---|---|
| Steam prices, 9 regions | Steam public storefront API (`appdetails?filters=price_overview`) | **Live** (marked with a green dot) |
| Exchange rates | open.er-api.com | **Live** (fallback table if unreachable) |
| Key shop prices | [gg.deals Prices API](https://gg.deals/api/prices/) | **Live if** you set `GGDEALS_API_KEY` (free key); otherwise **sample** |
| Epic, GOG, PSN, Xbox, Nintendo, Rockstar prices; individual key shops | no free public API | **Sample** (hollow dot). Plug a provider in `server/src/providers/` |
| Game info, covers, news, requirements (14 showcase games) | Steam snapshot of 7 Nov 2026 (translated to English) | Static |
| History before the first live check (14 showcase games) | deterministic simulation | Illustrative; real changes are recorded from then on |
| **Imported catalog** (≈500 games) | Steam charts + store API, via `npm run import:games` (see below) | Metadata: snapshot of the import day. **Prices: live only** — Steam (9 regions) and gg.deals; no sample price, no invented history |

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
npm test             # all tests: server (node:test, 21) + client (Vitest + Testing Library, 14)
npm run lint         # ESLint (React + hooks rules, client and server)
npm run format       # Prettier (format:check to verify only)
```

Optional configuration: copy `server/.env.example` to `server/.env` (port, refresh interval, `GGDEALS_API_KEY`, `STEAM_LIVE=0` to work offline).

**Prototype and slide deck** (static, no install needed): open `prototype/index.html` or `presentation/index.html` in a browser. The scripts that produced them live in `tools/` (`cd tools && npm install`, then `npm run games` to fetch Steam data and covers, `npm run icons`, `npm run shots` for the deck screenshots, `npm run pdf` to export the deck to `livrables/`).

## 5. Project structure

```
prototype/              clickable HTML/CSS/JS design prototype (French), 4 pages
presentation/           slide deck (GSAP + three.js)
livrables/              submitted deliverables (deck as PDF, zipped prototype + deck)
tools/                  Steam data fetch, icons, screenshots, PDF export for the prototype and deck
server/
  src/index.js          entry point
  src/api.js            REST routes + SSE (/api/events)
  src/engine.js         price watcher: poll, diff, history, change feed, demo drift
  src/pricing.js        read-only logic: best price, all-time low, verdict, regional table
  src/providers/        steam.js (live), ggdeals.js (optional live)
  src/seed.js, store.js initial data + JSON persistence
  src/catalog.json      game metadata (English)
  src/wishlist.js       my list & alerts REST routes (per anonymous browser id)
  src/query.js          server-side search: filters, sort, paging, facets, suggestions
  src/images.js         image proxy: Steam images → resized, cached WebP
  src/catalogRefresh.js weekly background re-import of the Steam catalog
  scripts/import-steam.js  catalog import (CLI and background)
  test/                 node:test suites (fake Steam server included)
client/
  src/pages/            Home, Browse, Game, Wishlist, Changes, Contact, NotFound (lazy-loaded except Home)
  src/components/       one file per reusable component: GameCard, Cover, Badges, StoreChip,
                        ChangeList, Skeleton, Spinner, ErrorState, ErrorBoundary, AlertDialog, charts
  src/components/layout Header, SearchBox, Footer, TabBar, Toast
  src/context/          AppProvider: region, games, SSE connection, my list (server sync), toasts
  src/hooks/            useApp, useApi (fetch + loading/error/retry), useDocumentTitle
  src/assets/           fonts (woff2) and icons
  src/styles/           design tokens + CSS from the prototype (+ extra.css)
  src/__tests__/        Vitest + Testing Library suites
```

### REST API

`GET /api/meta` · `GET /api/games/:id?region=tr` · `GET /api/changes?kind=official|key&region=` · `GET /api/events` (SSE) · `POST /api/refresh` ("Check now", rate limited) · `POST /api/contact`

Search (the browser never downloads the whole catalog):
`GET /api/games?region=us&q=&plat=&genre=&max=&promo=1&low=1&when=out|soon&pegi=&sort=popular|price|key|discount|date|release&offset=&limit=&ids=a,b&facets=1` → `{ total, games, facets }` (no parameter = every game) ·
`GET /api/search?q=` → header suggestions `{ games, studios }` ·
`GET /api/img/:id/cover|coverSm|hero|heroSm` → resized WebP of an imported game's Steam image

My list (header `X-Client-Id`: a random id the browser keeps in localStorage — no accounts), with validation (422/404/409):
`GET /api/wishlist` · `POST /api/wishlist` `{id, target?, alert?}` · `PATCH /api/wishlist/:id` `{target?, alert?}` · `DELETE /api/wishlist/:id` · `PUT /api/wishlist/prefs` `{drops, releases}`

## 6. Importing hundreds of games (`server/scripts/import-steam.js`)

```bash
npm run import:games -w server -- --count 500   # ≈25 min the first time, instant when re-run (cached)
```

1. **Discovery** from Steam's own charts (public, no key): store *Top sellers* + *Most played* (`ISteamChartsService`).
   SteamDB was considered: its rules forbid automated collection and it has no API (its data comes from these same Steam APIs), so PlayRadar reads the original source.
2. **Details** from the Steam store API (`appdetails`): title, studio, genres, release date, PEGI, description, PC requirements, cover/hero images (Steam CDN), plus the 3 latest official announcements (`ISteamNews`).
3. Only paid games are kept (free-to-play titles, DLC, hardware and soundtracks have no price to compare). Result: `server/src/catalog.imported.json`.
4. **Automatic refresh:** the server re-runs the import in the background every `CATALOG_REFRESH_DAYS` (default 7) and reloads the catalog without restarting. Cached Steam answers expire (charts 2 days, details 30, news 7). A game keeps its id across imports, and games that leave the charts are kept (someone may track them).
5. **Images** go through the server's image proxy: the Steam cover (600×900 JPG, ≈50 KB) becomes a 300×450 WebP (≈19 KB), the hero 339 KB → 95 KB; converted once, then served from `server/data/img-cache/`.
6. **Prices are never stored by the importer.** The watcher fetches them live: Steam in 9 regions every 10 min (100 games per request), gg.deals keyshop prices and historical lows in the background, 100 games per minute.

## 7. Performance and accessibility

* **Accessibility:** text colours pass WCAG AA (secondary text 5.25:1 on panels); search box follows the ARIA combobox pattern; ordered headings; labelled icon-only buttons; form errors linked with `aria-describedby`; screen-reader text for struck-out prices.
* **Images:** WebP with 150px/960px variants and `srcset` (5.8 MB → 2.0 MB on disk; Elden Ring hero 204 KB → 39 KB, 12 KB on mobile); image proxy for the imported games; LCP image with `fetchpriority="high"`.
* **Loading:** gzip on the server; 1-year immutable cache for fingerprinted assets; preloaded fonts; JavaScript split into a 50 KB app + 164 KB vendor bundle (cached separately) + one 0.4–24 KB chunk per page; `robots.txt`.
* **Live connection:** the update stream is closed on `pagehide` and reopened on `pageshow`, so pages kept in the back/forward cache don't hold connections open.

**Lighthouse** (mobile, simulated slow 4G, production build served by `npm start`, 514 games):

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Home | 95 | 100 | 100 | 100 | 2.8 s | 0 |
| Game page | 95–96 | 100 | 100 | 100 | 2.8 s | 0 |
| Search / My list / Changes / Contact | 94 / 96 / 97 / 98 | 100 | 100 | 100 | ≤ 3.3 s | ≤ 0.04 |

Tested in Chrome and Edge (headless) at 375 px, 820 px and 1440 px: no horizontal scrolling, all pages load, my-list CRUD round-trips to the server, keyboard search works.

## 8. Known limits / next steps

* Only Steam (and optionally gg.deals) are live; other stores need their own provider.
* Steam regional prices are for comparison: you can only buy at the price of your own account's region.
* My list is tied to the browser's anonymous id, not to an account: clearing site data starts a new list. E-mail alerts are out of scope (alerts appear in the page).
* Over plain HTTP/1.1 each open tab keeps one live-update connection; browsers allow 6 per site, so more than ~5 PlayRadar tabs at once can stall. Serving over HTTP/2 (any HTTPS host or reverse proxy) removes the limit.
* Covers are the Steam snapshot taken for the prototype; the GTA V cover carries French text.
* Imported games are PC (Steam) only. Their price history starts the day PlayRadar first saw them, and their *all-time low* / buy-or-wait verdict appear only once gg.deals provides the real historical low (needs `GGDEALS_API_KEY`).
* gg.deals' free tier allows 1000 games per hour: with ≈500 games, keyshop prices are refreshed about every 35 minutes (Steam prices every 10 minutes). Your gg.deals account e-mail must be confirmed, otherwise the API answers *HTTP 400: You need to confirm your email address* (shown in the status).
* The prototype and the deck are in French; the application is in English.
* Firefox and Safari were not tested (not installed on the test machine); Chrome and Edge were.
