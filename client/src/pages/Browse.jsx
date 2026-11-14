import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp } from "../context.jsx";
import { usd, norm } from "../lib.js";
import { Icon, GameCard } from "../components/ui.jsx";

const MAX = 110;
const SORTS = {
  relevance: (a, b) => (b.isLow ? 1 : 0) - (a.isLow ? 1 : 0) || b.discount - a.discount,
  price: (a, b) => (a.official ? a.official.price : 1e9) - (b.official ? b.official.price : 1e9),
  key: (a, b) => (a.key ? a.key.price : 1e9) - (b.key ? b.key.price : 1e9),
  discount: (a, b) => b.discount - a.discount,
  date: (a, b) => b.release.localeCompare(a.release),
};

export default function Browse() {
  const { games, region, meta } = useApp();
  const [sp, setSp] = useSearchParams();
  const [view, setView] = useState("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => { document.title = "Search — PlayRadar"; }, []);

  const st = {
    q: sp.get("q") || "",
    plats: sp.getAll("plat"),
    genres: sp.getAll("genre"),
    max: +(sp.get("max") || MAX),
    promo: sp.get("promo") === "1",
    low: sp.get("low") === "1",
    when: sp.get("when") || "all",
    pegi: +(sp.get("pegi") || 18),
    sort: sp.get("sort") || "relevance",
  };
  const set = (patch) => {
    const next = { ...st, ...patch };
    const u = new URLSearchParams();
    if (next.q) u.set("q", next.q);
    next.plats.forEach((v) => u.append("plat", v));
    next.genres.forEach((v) => u.append("genre", v));
    if (next.max < MAX) u.set("max", next.max);
    if (next.promo) u.set("promo", "1");
    if (next.low) u.set("low", "1");
    if (next.when !== "all") u.set("when", next.when);
    if (next.pegi < 18) u.set("pegi", next.pegi);
    if (next.sort !== "relevance") u.set("sort", next.sort);
    setSp(u, { replace: true });
  };
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const all = games || [];
  const genres = useMemo(() => [...new Set(all.flatMap((g) => g.genres))].sort(), [games]);
  const plats = useMemo(() => {
    const count = (p) => all.filter((g) => g.platforms.includes(p)).length;
    return [...new Set(all.flatMap((g) => g.platforms))].sort((a, b) => count(b) - count(a));
  }, [games]);

  const results = all
    .filter((g) => {
      const nq = norm(st.q);
      if (nq && !norm([g.title, g.aliases, g.studio, g.publisher, ...g.genres].join(" ")).includes(nq)) return false;
      if (st.plats.length && !g.platforms.some((p) => st.plats.includes(p))) return false;
      if (st.genres.length && !g.genres.some((x) => st.genres.includes(x))) return false;
      if (st.max < MAX && (!g.official || g.official.price > st.max)) return false;
      if (st.promo && !(g.discount > 0)) return false;
      if (st.low && !g.isLow) return false;
      if (st.when === "out" && g.upcoming) return false;
      if (st.when === "soon" && !g.upcoming) return false;
      if ((g.pegi || 0) > st.pegi) return false;
      return true;
    })
    .sort(SORTS[st.sort]);

  const chips = [];
  if (st.q) chips.push(["q", `“${st.q}”`, () => set({ q: "" })]);
  st.plats.forEach((v) => chips.push(["p" + v, v, () => set({ plats: toggle(st.plats, v) })]));
  st.genres.forEach((v) => chips.push(["g" + v, v, () => set({ genres: toggle(st.genres, v) })]));
  if (st.max < MAX) chips.push(["max", `≤ ${usd(st.max)}`, () => set({ max: MAX })]);
  if (st.promo) chips.push(["promo", "On sale", () => set({ promo: false })]);
  if (st.low) chips.push(["low", "All-time low", () => set({ low: false })]);
  if (st.when !== "all") chips.push(["when", st.when === "out" ? "Released" : "Upcoming", () => set({ when: "all" })]);
  if (st.pegi < 18) chips.push(["pegi", `PEGI ${st.pegi} max`, () => set({ pegi: 18 })]);
  const regionName = meta?.regions.find((r) => r.code === region)?.name;

  return (
    <main id="main" className="wrap">
      <div className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><Icon name="chevron-right" /><span>Search</span></nav>
        <h1>{st.q ? <>Results for <em>“{st.q}”</em></> : st.promo ? "Current deals" : st.when === "soon" ? "Upcoming releases" : "All games"}</h1>
      </div>

      <div className="search-layout">
        <form className={"filters" + (filtersOpen ? " is-open" : "")} aria-label="Filters" onSubmit={(e) => e.preventDefault()}>
          <div className="filters__head"><h2>Filters</h2><button type="button" className="filters__reset" onClick={() => setSp({}, { replace: true })}>Clear all</button></div>
          <fieldset className="fgroup"><legend>Platform</legend>
            {plats.map((p) => (
              <label key={p} className="check"><input type="checkbox" checked={st.plats.includes(p)} onChange={() => set({ plats: toggle(st.plats, p) })} /> {p}<small>{all.filter((g) => g.platforms.includes(p)).length}</small></label>
            ))}
          </fieldset>
          <fieldset className="fgroup"><legend>Genre</legend>
            <div className="chips">{genres.map((g) => <button key={g} type="button" className="chip" aria-pressed={st.genres.includes(g)} onClick={() => set({ genres: toggle(st.genres, g) })}>{g}</button>)}</div>
          </fieldset>
          <fieldset className="fgroup"><legend>Maximum official price</legend>
            <div className="range">
              <input type="range" min="5" max={MAX} step="5" value={st.max} onChange={(e) => set({ max: +e.target.value })} aria-label="Maximum price" />
              <div className="range__val"><span>$5</span><b>{st.max >= MAX ? "No limit" : `≤ ${usd(st.max)}`}</b><span>${MAX}</span></div>
            </div>
          </fieldset>
          <fieldset className="fgroup"><legend>Offers</legend>
            <label className="toggle-row">On sale <span className="switch"><input type="checkbox" checked={st.promo} onChange={(e) => set({ promo: e.target.checked })} /><span /></span></label>
            <label className="toggle-row">At all-time low <span className="switch"><input type="checkbox" checked={st.low} onChange={(e) => set({ low: e.target.checked })} /><span /></span></label>
          </fieldset>
          <fieldset className="fgroup"><legend>Release</legend>
            <div className="seg" role="group" aria-label="Release date">
              {[["all", "All"], ["out", "Released"], ["soon", "Upcoming"]].map(([v, l]) => <button key={v} type="button" aria-pressed={st.when === v} onClick={() => set({ when: v })}>{l}</button>)}
            </div>
          </fieldset>
          <fieldset className="fgroup"><legend>Age rating (max PEGI)</legend>
            <div className="seg" role="group" aria-label="Maximum PEGI">
              {[3, 7, 12, 16, 18].map((v) => <button key={v} type="button" aria-pressed={st.pegi === v} onClick={() => set({ pegi: v })}>{v}</button>)}
            </div>
          </fieldset>
          <button type="button" className="btn btn--primary btn--block filters-btn" onClick={() => setFiltersOpen(false)}>Show results</button>
        </form>

        <section className={"results" + (view === "list" ? " is-list" : "")} aria-live="polite">
          <div className="results__bar">
            <p className="results__count">{results.length} game{results.length !== 1 ? "s" : ""} <span>· official prices for {regionName}</span></p>
            <button type="button" className="btn btn--ghost btn--sm filters-btn" onClick={() => setFiltersOpen(true)}><Icon name="sliders-horizontal" />{chips.length ? `Filters (${chips.length})` : "Filters"}</button>
            <label className="select">
              <select value={st.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort by">
                <option value="relevance">Relevance</option>
                <option value="price">Official price: low to high</option>
                <option value="key">Key price: low to high</option>
                <option value="discount">Biggest discount</option>
                <option value="date">Newest</option>
              </select>
              <Icon name="chevron-down" />
            </label>
            <div className="seg" role="group" aria-label="Display">
              <button type="button" aria-pressed={view === "grid"} aria-label="Grid" onClick={() => setView("grid")}><Icon name="layout-grid" /></button>
              <button type="button" aria-pressed={view === "list"} aria-label="List" onClick={() => setView("list")}><Icon name="list" /></button>
            </div>
            <div className="active-chips">{chips.map(([k, l, rm]) => <button key={k} type="button" className="chip is-on" onClick={rm}>{l}<Icon name="x" /></button>)}</div>
          </div>
          <div>
            <div className="grid-cards grid-cards--4">
              {!games ? <p className="muted">Loading…</p> : results.length ? results.map((g) => <GameCard key={g.id} g={g} />) : (
                <div className="empty"><h3>No game matches</h3><p>Raise the maximum price or remove a filter.</p><button className="btn btn--ghost btn--sm" type="button" style={{ marginTop: 16 }} onClick={() => setSp({}, { replace: true })}>Clear filters</button></div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
