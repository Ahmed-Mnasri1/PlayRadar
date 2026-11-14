import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import ICONS from "../icons.js";
import { useApp } from "../context.jsx";
import { usd, pct, norm, fmtDate, timeAgo } from "../lib.js";

export function Icon({ name, className = "" }) {
  return (
    <svg className={"i " + className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }} />
  );
}

export function Cover({ game, size = "", ...rest }) {
  return (
    <div className={"cover " + (size ? "cover--" + size : "")} {...rest}>
      <img className="cover__img" src={game.img.cover} alt={`${game.title} cover`} loading="lazy" decoding="async" />
    </div>
  );
}

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="PlayRadar, home">
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
        <path d="M16 16 L27.5 9.5 A14 14 0 0 1 30 16 Z" fill="var(--radar)" opacity=".35" />
        <path d="M16 16 L27.5 9.5" stroke="var(--radar)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="2.2" fill="currentColor" />
        <circle cx="22.5" cy="11" r="2" fill="var(--radar)" />
      </svg>
      <span className="logo__word">Play<b>Radar</b></span>
    </Link>
  );
}

/* ---------- badges ---------- */
export const DiscountBadge = ({ g }) => (g.discount > 0 ? <span className="badge badge--signal">{pct(g.discount)}</span> : null);
export const LowBadge = ({ g }) => (g.isLow ? <span className="badge badge--low"><Icon name="trending-down" />All-time low</span> : null);
export const PreorderBadge = ({ g }) => (g.upcoming ? <span className="badge badge--sky"><Icon name="calendar-clock" />{g.official ? "Pre-order" : "Announced"}</span> : null);
export const Pegi = ({ g }) => (g.pegi ? <span className={"pegi pegi--" + g.pegi} title={`PEGI ${g.pegi}${g.pegiDesc ? " · " + g.pegiDesc : ""}`}>PEGI {g.pegi}</span> : null);

export function Verdict({ g }) {
  if (g.upcoming || !g.verdict) return null;
  if (g.verdict === "buy") return <span className="verdict verdict--buy"><Icon name="check" />Good deal</span>;
  if (g.verdict === "new") return <span className="verdict verdict--new"><Icon name="info" />Never on sale</span>;
  return <span className="verdict verdict--wait"><Icon name="clock" />Better to wait</span>;
}

export function StoreChip({ id }) {
  const { meta } = useApp();
  const s = meta && meta.stores[id];
  if (!s) return <span className="store">{id}</span>;
  return (
    <span className="store"><span className="store__mono" style={{ "--tint": s.tint }}>{s.short}</span>{s.name}</span>
  );
}

export const SourceDot = ({ src }) =>
  src === "live" ? <i className="real-dot" title="Live price, fetched from the store's public API" /> : <i className="sample-dot" title="Sample price (no public API connected for this store)" />;

/* ---------- game card ---------- */
export function GameCard({ g }) {
  const date = g.upcoming ? (g.release.length === 4 ? `Releases ${g.release}` : `Releases ${fmtDate(g.release, { month: "long", day: "numeric" })}`) : g.genres[0] || "";
  return (
    <article className="gcard">
      <Link className="gcard__link" to={`/game/${g.id}`} aria-label={`${g.title}${g.official ? ", " + usd(g.official.price) : ""}`}>
        <div className="cover gcard__cover">
          <img className="cover__img" src={g.img.cover} alt={`${g.title} cover`} loading="lazy" decoding="async" />
          <div className="gcard__badges"><DiscountBadge g={g} /><PreorderBadge g={g} /></div>
        </div>
        <div className="gcard__body">
          <div className="gcard__meta"><span>{date}</span><span className="gcard__plat">{g.platforms.map((p) => p.replace(" Series", "")).join(" · ")}</span></div>
          <h3 className="gcard__title">{g.title}</h3>
          <div className="gcard__price">
            {g.official ? <span className="price">{usd(g.official.price)}</span> : <span className="price price--tba">Price TBA</span>}
            {g.discount > 0 && <s className="was">{usd(g.base)}</s>}
          </div>
          <div className="gcard__foot">
            {g.isLow ? <LowBadge g={g} /> : g.official ? <span className="gcard__store">{storeName(g.official.store)}</span> : <span className="gcard__store">Alert when pre-orders open</span>}
            {g.key && <span className="gcard__key" title="Cheapest key (same price in every region)"><Icon name="tag" />Keys {usd(g.key.price)}</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
const NAMES = { steam: "Steam", epic: "Epic Games Store", gog: "GOG", rockstar: "Rockstar Store", psn: "PlayStation Store", xbox: "Xbox Store", nintendo: "Nintendo eShop" };
export const storeName = (id) => NAMES[id] || id;

/* ---------- header ---------- */
function SearchBox() {
  const { games } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const ref = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(e.target.tagName)) {
        e.preventDefault();
        input.current && input.current.focus();
      }
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const nq = norm(q.trim());
  const list = games || [];
  const results = nq ? list.filter((g) => norm([g.title, g.aliases, g.genres.join(" ")].join(" ")).includes(nq)).slice(0, 5) : list.filter((g) => g.discount >= 30 && !g.upcoming).slice(0, 4);
  const studios = nq ? [...new Set(list.map((g) => g.studio))].filter((s) => norm(s).includes(nq)).slice(0, 2) : [];
  const links = [...results.map((g) => `/game/${g.id}`), ...studios.map((s) => `/browse?q=${encodeURIComponent(s)}`), ...(nq ? [`/browse?q=${encodeURIComponent(q.trim())}`] : [])];
  const go = (to) => {
    setOpen(false);
    setQ("");
    nav(to);
  };

  return (
    <form
      ref={ref}
      className={"search" + (open ? " is-open" : "")}
      role="search"
      autoComplete="off"
      onSubmit={(e) => {
        e.preventDefault();
        go(idx >= 0 ? links[idx] : `/browse?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Icon name="search" className="search__icon" />
      <input
        ref={input}
        className="search__input"
        type="search"
        placeholder="Search a game or a studio…"
        aria-label="Search a game or a studio"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => (setQ(e.target.value), setOpen(true), setIdx(-1))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setIdx((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % Math.max(1, links.length));
          } else if (e.key === "Escape") {
            setOpen(false);
            e.target.blur();
          }
        }}
      />
      <kbd className="search__kbd" aria-hidden="true">/</kbd>
      <div className="suggest" role="listbox" hidden={!open}>
        <p className="suggest__label">{nq ? "Games" : "Hot deals right now"}</p>
        {results.length ? (
          results.map((g, i) => (
            <Link key={g.id} className={"suggest__item" + (idx === i ? " is-active" : "")} role="option" to={`/game/${g.id}`} onClick={() => go(`/game/${g.id}`)}>
              <span className="cover cover--xxs"><img className="cover__img" src={g.img.cover} alt="" /></span>
              <span className="suggest__txt"><b>{g.title}</b><small>{g.studio} · {g.platforms.join(", ")}</small></span>
              <span className="suggest__price">{g.official ? <span className="price">{usd(g.official.price)}</span> : <small>Price TBA</small>}{g.discount > 0 && <small className="t-signal">{pct(g.discount)}</small>}</span>
            </Link>
          ))
        ) : (
          <p className="suggest__empty">No game matches “{q}”.</p>
        )}
        {studios.length > 0 && <p className="suggest__label">Studios</p>}
        {studios.map((s, i) => (
          <Link key={s} className={"suggest__item suggest__item--studio" + (idx === results.length + i ? " is-active" : "")} role="option" to={`/browse?q=${encodeURIComponent(s)}`} onClick={() => go(`/browse?q=${encodeURIComponent(s)}`)}>
            <Icon name="users" /><span className="suggest__txt"><b>{s}</b><small>{list.filter((g) => g.studio === s).length} game(s)</small></span>
          </Link>
        ))}
        {nq && <Link className="suggest__all" role="option" to={`/browse?q=${encodeURIComponent(q.trim())}`} onClick={() => go(`/browse?q=${encodeURIComponent(q.trim())}`)}>See all results for “{q}” <Icon name="arrow-right" /></Link>}
      </div>
    </form>
  );
}

export function RegionSelect() {
  const { meta, region, setRegion } = useApp();
  return (
    <label className="regionsel" title="Official store prices depend on the region. Key prices are the same everywhere.">
      <Icon name="globe" />
      <span className="sr-only">Store region</span>
      <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Store region">
        {(meta ? meta.regions : [{ code: "us", name: "United States" }]).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
      </select>
      <b className="regionsel__cur">USD</b>
    </label>
  );
}

export function LivePill() {
  const { live } = useApp();
  const s = live.status;
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const steamOk = s && s.sources.steam.ok;
  const label = !live.connected ? "Reconnecting…" : steamOk ? "Live" : "Sample data";
  const title = !s ? "" : `Last check: ${s.lastRun ? timeAgo(s.lastRun) : "never"} · Steam: ${steamOk ? "live" : s.sources.steam.error || "not reached yet"}`;
  return (
    <Link to="/changes" className={"livepill " + (live.connected && steamOk ? "is-live" : "is-off")} title={title}>
      <i />{label}
    </Link>
  );
}

export function Header() {
  const { wishlist } = useApp();
  return (
    <header className="header">
      <div className="header__in wrap">
        <Logo />
        <SearchBox />
        <nav className="nav" aria-label="Main navigation">
          <NavLink className="nav__link" to="/browse?when=soon">Releases</NavLink>
          <NavLink className="nav__link" to="/browse?promo=1">Deals</NavLink>
          <NavLink className="nav__link" to="/changes">Price changes</NavLink>
          <NavLink className="nav__link" to="/wishlist">My list<span className="nav__count">{wishlist.length}</span></NavLink>
        </nav>
        <LivePill />
        <RegionSelect />
        <Link className="avatar" to="/wishlist" aria-label="My list">Y</Link>
      </div>
    </header>
  );
}

export function TabBar() {
  const items = [["/", "Home", "house"], ["/browse", "Search", "search"], ["/changes", "Changes", "trending-down"], ["/wishlist", "My list", "bookmark"]];
  return (
    <nav className="tabbar" aria-label="Mobile navigation">
      {items.map(([to, label, ic]) => (
        <NavLink key={to} className="tabbar__item" to={to} end={to === "/"}><Icon name={ic} /><span>{label}</span></NavLink>
      ))}
    </nav>
  );
}

export function Footer() {
  const { live, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const s = live.status;
  async function check() {
    setBusy(true);
    try {
      const r = await fetch("/api/refresh", { method: "POST" });
      const body = await r.json();
      toast(r.ok ? "Prices checked just now" : body.error || "Could not refresh", r.ok ? "check" : "info");
    } catch {
      toast("The server is not reachable", "info");
    }
    setBusy(false);
  }
  return (
    <footer className="footer">
      <div className="wrap footer__in">
        <div className="footer__brand">
          <Logo />
          <p>Compare official store prices (by region) and key shop prices (same everywhere), all in US dollars. PlayRadar sells no games: we point you to the right store.</p>
          <p className="footer__status">
            <span className={"dot " + (s && s.sources.steam.ok ? "ok" : "")} />
            {s ? `Last check ${s.lastRun ? timeAgo(s.lastRun) : "—"} · next in ≈ ${s.nextRun ? Math.max(0, Math.round((s.nextRun - Date.now()) / 60000)) : "?"} min` : "Connecting…"}
            <button type="button" className="linklike" onClick={check} disabled={busy}>{busy ? "Checking…" : "Check now"}</button>
          </p>
        </div>
        <div className="footer__cols">
          <div><h3>Explore</h3><Link to="/browse">All games</Link><Link to="/browse?promo=1">Deals</Link><Link to="/browse?when=soon">Releases</Link><Link to="/changes">Price changes</Link></div>
          <div><h3>My account</h3><Link to="/wishlist">My list</Link><Link to="/wishlist#alerts">My alerts</Link></div>
          <div><h3>PlayRadar</h3><Link to="/contact">Contact</Link><a href="https://steamdb.info/" target="_blank" rel="noopener noreferrer">SteamDB</a><a href="https://gg.deals/" target="_blank" rel="noopener noreferrer">gg.deals</a></div>
        </div>
      </div>
      <div className="wrap footer__legal">
        <span>Web Project · SUP'COM 2026–2027 · Group 9</span>
        <span>Steam prices are fetched live; other stores use sample data unless noted. Covers © their publishers. Prices converted to USD at indicative exchange rates.</span>
      </div>
    </footer>
  );
}

export function Toast() {
  const { toastState } = useApp();
  return (
    <div className={"toast" + (toastState ? " is-on" : "")} role="status" aria-live="polite">
      {toastState && <><Icon name={toastState.icon} /><span dangerouslySetInnerHTML={{ __html: toastState.msg }} /></>}
    </div>
  );
}
