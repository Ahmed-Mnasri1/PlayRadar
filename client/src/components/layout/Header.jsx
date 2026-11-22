import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../Icon.jsx";
import Logo from "../Logo.jsx";
import SearchBox from "./SearchBox.jsx";
import { useApp } from "../../hooks/useApp.js";
import { timeAgo } from "../../lib.js";

/** Region picker: official store prices follow it, key prices do not. */
export function RegionSelect() {
  const { meta, region, setRegion } = useApp();
  return (
    <label className="regionsel" title="Official store prices depend on the region. Key prices are the same everywhere.">
      <Icon name="globe" />
      <span className="sr-only">Store region</span>
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        {(meta ? meta.regions : [{ code: "us", name: "United States" }]).map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
      <b className="regionsel__cur" aria-hidden="true">
        USD
      </b>
    </label>
  );
}

/** "Live" / "Sample data" / "Reconnecting…" status of the price watcher. */
export function LivePill() {
  const { live } = useApp();
  const s = live.status;
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000); // keeps "x min ago" fresh
    return () => clearInterval(t);
  }, []);
  const steamOk = s && s.sources.steam.ok;
  const label = !live.connected ? "Reconnecting…" : steamOk ? "Live" : "Sample data";
  const title = !s
    ? ""
    : `Last check: ${s.lastRun ? timeAgo(s.lastRun) : "never"} · Steam: ${steamOk ? "live" : s.sources.steam.error || "not reached yet"}`;
  return (
    <Link to="/changes" className={"livepill " + (live.connected && steamOk ? "is-live" : "is-off")} title={title}>
      <i />
      {label}
    </Link>
  );
}

/**
 * Header link that is "current" only when its query matches too: React Router's NavLink
 * compares the path alone, so /browse?when=soon and /browse?promo=1 were both active.
 */
function NavItem({ to, children }) {
  const { pathname, search } = useLocation();
  const [path, qs] = to.split("?");
  const have = new URLSearchParams(search);
  const active = pathname === path && [...new URLSearchParams(qs)].every(([k, v]) => have.get(k) === v);
  return (
    <Link className="nav__link" to={to} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

export default function Header() {
  const { wishlist } = useApp();
  return (
    <header className="header">
      <div className="header__in wrap">
        <Logo />
        <SearchBox />
        <nav className="nav" aria-label="Main navigation">
          <NavItem to="/browse?when=soon">Releases</NavItem>
          <NavItem to="/browse?promo=1">Deals</NavItem>
          <NavItem to="/changes">Price changes</NavItem>
          <NavItem to="/wishlist">
            My list
            <span className="nav__count" aria-label={`${wishlist.length} games`}>
              {wishlist.length}
            </span>
          </NavItem>
        </nav>
        <LivePill />
        <RegionSelect />
        <Link className="avatar" to="/wishlist" aria-label="My list">
          Y
        </Link>
      </div>
    </header>
  );
}
