import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useApp } from "../context.jsx";
import { api, usd, pct, fmtDate, timeAgo } from "../lib.js";
import { Icon, GameCard, Verdict, Cover, storeName } from "../components/ui.jsx";

const BLIPS = [
  { id: "gta-v", x: 70, y: 22, tag: () => <span className="badge badge--line blip__tag" style={{ background: "var(--panel)" }}>Update</span> },
  { id: "fable", x: 24, y: 30, left: true, tag: () => <span className="badge badge--signal blip__tag">Pre-order</span> },
  { id: "no-mans-sky", x: 76, y: 66, tag: (g) => <span className="badge badge--radar blip__tag">{pct(g.discount)}</span> },
  { id: "lego-star-wars", x: 30, y: 74, left: true, tag: () => <span className="badge badge--low blip__tag" style={{ background: "var(--panel)" }}>All-time low</span> },
  { id: "hollow-knight-silksong", x: 47, y: 46, tag: () => null },
];

export default function Home() {
  const { games, game, region, version, meta } = useApp();
  const [changes, setChanges] = useState([]);
  useEffect(() => {
    document.title = "PlayRadar — The right game, at the right price, at the right time";
  }, []);
  useEffect(() => {
    api("/changes?limit=5").then((d) => setChanges(d.changes)).catch(() => {});
  }, [version]);
  if (!games) return <main id="main" className="wrap"><p className="muted" style={{ padding: 80 }}>Loading prices…</p></main>;

  const feat = game("gta-v");
  const deals = games.filter((g) => !g.upcoming && g.discount > 0 && g.id !== "gta-v").sort((a, b) => b.discount - a.discount).slice(0, 5);
  const lows = games.filter((g) => g.isLow && !deals.includes(g)).slice(0, 5);
  const upcoming = games.filter((g) => g.upcoming).sort((a, b) => (a.release.length === 4) - (b.release.length === 4) || a.release.localeCompare(b.release));
  const regionName = meta ? meta.regions.find((r) => r.code === region)?.name : "";
  const news = feat && null;

  return (
    <main id="main">
      <section className="hero wrap" aria-labelledby="hero-h">
        <div className="hero__copy">
          <p className="eyebrow enter" style={{ "--i": 0 }}>Price comparison · video games</p>
          <h1 className="hero__title" id="hero-h">
            <span className="line"><span style={{ "--i": 0 }}>The right game,</span></span>
            <span className="line"><span style={{ "--i": 1 }}>at the right price,</span></span>
            <span className="line"><span className="t-radar" style={{ "--i": 2 }}>at the right time.</span></span>
          </h1>
          <p className="hero__lead enter" style={{ "--i": 4 }}>
            PlayRadar compares official stores — whose prices change with your region — and key shops, which sell at one price worldwide. History for every price, refreshed automatically. Everything in US dollars.
          </p>
          <HeroSearch />
          <div className="hero__chips chips enter" style={{ "--i": 6 }}>
            <Link className="chip" to="/browse?plat=PC">PC</Link>
            <Link className="chip" to="/browse?plat=PS5">PS5</Link>
            <Link className="chip" to="/browse?plat=Xbox%20Series">Xbox Series</Link>
            <Link className="chip" to="/browse?max=20">Under $20</Link>
            <Link className="chip" to="/browse?low=1">All-time low</Link>
          </div>
          <ul className="hero__facts enter" style={{ "--i": 7 }}>
            <li><b>{meta ? meta.regions.length : 9}</b><span>store regions tracked</span></li>
            <li><b>Live</b><span>automatic price updates</span></li>
            <li><b>12 mo.</b><span>of history per game</span></li>
          </ul>
        </div>

        <div className="radar" aria-hidden="true">
          <div className="radar__disc" />
          <svg className="radar__grid" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth=".25">
            <circle cx="50" cy="50" r="49.5" /><circle cx="50" cy="50" r="37" /><circle cx="50" cy="50" r="24.5" /><circle cx="50" cy="50" r="12" />
            <path d="M50 .5V99.5M.5 50H99.5" strokeDasharray=".8 1.2" />
          </svg>
          <div className="radar__sweep" /><div className="radar__core" />
          <div>
            {BLIPS.map((b) => {
              const g = game(b.id);
              if (!g) return null;
              const a = (Math.atan2(b.x - 50, -(b.y - 50)) * 180) / Math.PI;
              const delay = (((a + 360) % 360) / 360) * 6;
              return (
                <div key={b.id} className={"blip " + (b.left ? "blip--left" : "")} style={{ "--x": b.x + "%", "--y": b.y + "%", "--d": delay.toFixed(2) + "s" }}>
                  <div className="blip__dot"><div className="cover"><img className="cover__img" src={g.img.cover} alt="" /></div></div>
                  {b.tag(g)}
                </div>
              );
            })}
          </div>
          <p className="radar__legend"><i />Scanning stores…</p>
        </div>
      </section>

      {feat && feat.official && (
        <section className="section wrap" aria-label="Featured">
          <Link className="feature" to={`/game/${feat.id}`}>
            <img className="feature__art" src={feat.img.hero} alt="" />
            <div className="feature__copy">
              <p className="eyebrow">Featured · {regionName}</p>
              <h2>{feat.title}</h2>
              <p className="feature__lead">{feat.tagline}</p>
              <div className="feature__row">
                <span className="feature__price"><span className="price">{usd(feat.official.price)}</span><small>{storeName(feat.official.store)}{feat.discount > 0 ? " · " + pct(feat.discount) : ""}{feat.key ? ` · keys from ${usd(feat.key.price)}` : ""}</small></span>
                <Verdict g={feat} />
                <span className="btn btn--primary">Compare prices <Icon name="arrow-right" className="m-arrow" /></span>
              </div>
            </div>
            <div className="cover feature__cover"><img className="cover__img" src={feat.img.cover} alt="" /></div>
          </Link>
        </section>
      )}

      <section className="section wrap" aria-labelledby="deals-h">
        <div className="section__head">
          <div><h2 id="deals-h">Today's best deals</h2><p>The biggest discounts on official stores in {regionName}. Updated automatically.</p></div>
          <Link className="link-more" to="/browse?promo=1">All deals <Icon name="arrow-right" /></Link>
        </div>
        <div className="grid-cards">{deals.map((g) => <GameCard key={g.id} g={g} />)}</div>
      </section>

      <section className="section wrap" aria-labelledby="live-h">
        <div className="section__head">
          <div><h2 id="live-h">Latest price changes</h2><p>Every change detected by the watcher, as it happens.</p></div>
          <Link className="link-more" to="/changes">See all changes <Icon name="arrow-right" /></Link>
        </div>
        <ChangeList changes={changes} compact />
      </section>

      {lows.length > 0 && (
        <section className="section wrap">
          <div className="section__head"><div><h2>At their lowest price ever</h2><p>Never been cheaper on an official store in {regionName}.</p></div></div>
          <div className="grid-cards">{lows.map((g) => <GameCard key={g.id} g={g} />)}</div>
        </section>
      )}

      <section className="section wrap" aria-labelledby="up-h">
        <div className="section__head">
          <div><h2 id="up-h">Upcoming releases</h2><p>Dates, editions and pre-order bonuses in one place.</p></div>
          <Link className="link-more" to="/browse?when=soon">All upcoming <Icon name="arrow-right" /></Link>
        </div>
        <div className="upcoming">
          {upcoming.map((g) => {
            const precise = g.release.length === 10;
            const d = precise ? new Date(g.release + "T00:00:00") : null;
            return (
              <Link key={g.id} className="ucard" to={`/game/${g.id}`}>
                <Cover game={g} />
                <div className="ucard__body">
                  <div className="ucard__date"><b>{precise ? `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}` : g.release}</b><span>{precise ? d.getFullYear() : "Date TBA"}</span></div>
                  <h3>{g.title}</h3>
                  <p className="ucard__meta">{g.genres[0] || ""} · {g.platforms.map((p) => p.replace(" Series", "")).join(", ")}</p>
                  <p className="ucard__price">{g.official ? <>Pre-order from <span className="price">{usd(g.official.price)}</span></> : "Price not announced yet"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how-h">
        <div className="section__head"><h2 id="how-h">Three steps before you buy</h2></div>
        <div className="how">
          <article className="step"><span className="step__n">01</span><Icon name="search" /><h3>Search</h3><p>A name, a studio or a genre: suggestions appear from the first letter.</p></article>
          <article className="step"><span className="step__n">02</span><Icon name="chart-line" /><h3>Compare</h3><p>Official stores for your region, key shops, price history and a clear verdict: buy or wait.</p></article>
          <article className="step"><span className="step__n">03</span><Icon name="bell-ring" /><h3>Get alerted</h3><p>Set a target price: you are notified the moment the game drops below it.</p></article>
          <article className="local">
            <p className="eyebrow">Official vs. keys</p>
            <h3>Two kinds of prices</h3>
            <ul>
              <li><Icon name="store" />Official stores: price depends on your region</li>
              <li><Icon name="tag" />Key shops: same price in every region</li>
              <li><Icon name="info" />Keys can be region-locked — check before buying</li>
            </ul>
            <Link className="btn btn--sm" to="/browse">Compare now <Icon name="arrow-right" className="m-arrow" /></Link>
          </article>
        </div>
      </section>
    </main>
  );
}

function HeroSearch() {
  return (
    <form className="hero-search enter" style={{ "--i": 5 }} action="/browse" role="search">
      <Icon name="search" />
      <input type="search" name="q" placeholder="Which game are you looking for?" aria-label="Search a game" />
      <button className="btn btn--primary btn--lg" type="submit">Compare prices</button>
    </form>
  );
}

export function ChangeList({ changes, compact }) {
  if (!changes.length) return <div className="empty"><h3>No change detected yet</h3><p>The watcher checks the stores regularly. New price changes will appear here by themselves.</p></div>;
  return (
    <ul className={"changes" + (compact ? " changes--compact" : "")}>
      {changes.map((c) => (
        <li key={c.id}>
          <Link to={`/game/${c.gameId}`} className="change">
            <span className="cover cover--xxs"><img className="cover__img" src={c.cover} alt="" /></span>
            <span className="change__txt">
              <b>{c.title}</b>
              <small>{c.storeName} · {c.kind === "key" ? "Key shop (all regions)" : c.regionName}{c.src === "live" ? <i className="real-dot" title="Live price" /> : <i className="sample-dot" title="Sample price" />}</small>
            </span>
            <span className="change__price"><s>{usd(c.from)}</s><Icon name="arrow-right" /><b className="price">{usd(c.to)}</b></span>
            <span className={"badge " + (c.to < c.from ? "badge--radar" : "badge--signal")}>{c.pct > 0 ? "+" : "−"}{Math.abs(c.pct)}%</span>
            <time className="change__time">{timeAgo(c.t)}</time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
