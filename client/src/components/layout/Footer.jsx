import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../Logo.jsx";
import Spinner from "../Spinner.jsx";
import { useApp } from "../../hooks/useApp.js";
import { api, timeAgo } from "../../lib.js";

export default function Footer() {
  const { live, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const s = live.status;

  /** "Check now": asks the server to poll the stores right away (rate limited server-side). */
  async function check() {
    setBusy(true);
    try {
      await api("/refresh", { method: "POST" });
      toast("Prices checked just now", "check");
    } catch (e) {
      toast(e.status ? e.message : "The server is not reachable", "info");
    }
    setBusy(false);
  }

  const nextIn = s && s.nextRun ? Math.max(0, Math.round((s.nextRun - Date.now()) / 60000)) : "?";
  return (
    <footer className="footer">
      <div className="wrap footer__in">
        <div className="footer__brand">
          <Logo />
          <p>
            Compare official store prices (by region) and key shop prices (same everywhere), all in US dollars. PlayRadar sells no games: we
            point you to the right store.
          </p>
          <p className="footer__status">
            <span className={"dot " + (s && s.sources.steam.ok ? "ok" : "")} />
            {s ? `Last check ${s.lastRun ? timeAgo(s.lastRun) : "—"} · next in ≈ ${nextIn} min` : "Connecting…"}
            <button type="button" className="linklike" onClick={check} disabled={busy}>
              {busy ? (
                <>
                  <Spinner /> Checking…
                </>
              ) : (
                "Check now"
              )}
            </button>
          </p>
        </div>
        <div className="footer__cols">
          <div>
            <h2 className="footer__h">Explore</h2>
            <Link to="/browse">All games</Link>
            <Link to="/browse?promo=1">Deals</Link>
            <Link to="/browse?when=soon">Releases</Link>
            <Link to="/changes">Price changes</Link>
          </div>
          <div>
            <h2 className="footer__h">My account</h2>
            <Link to="/wishlist">My list</Link>
            <Link to="/wishlist#alerts">My alerts</Link>
          </div>
          <div>
            <h2 className="footer__h">PlayRadar</h2>
            <Link to="/contact">Contact</Link>
            <a href="https://steamdb.info/" target="_blank" rel="noopener noreferrer">
              SteamDB
            </a>
            <a href="https://gg.deals/" target="_blank" rel="noopener noreferrer">
              gg.deals
            </a>
          </div>
        </div>
      </div>
      <div className="wrap footer__legal">
        <span>Web Project · SUP’COM 2026–2027 · Group 9</span>
        <span>
          Steam prices are fetched live; other stores use sample data unless noted. Covers © their publishers. Prices converted to USD at
          indicative exchange rates.
        </span>
      </div>
    </footer>
  );
}
