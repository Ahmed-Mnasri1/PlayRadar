import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context.jsx";
import { api, usd, pct, fmtDate, timeAgo, averagePrice } from "../lib.js";
import { Icon, Cover, Pegi, Verdict, PreorderBadge, StoreChip, SourceDot } from "../components/ui.jsx";
import { PriceChart } from "../components/charts.jsx";
import AlertDialog from "../components/AlertDialog.jsx";

export default function Game() {
  const { id } = useParams();
  const { region, version, meta, wishlist, setWishlist, toast } = useApp();
  const [g, setG] = useState(null);
  const [err, setErr] = useState(null);
  const [months, setMonths] = useState(12);
  const [showKeys, setShowKeys] = useState(true);
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    let off = false;
    api(`/games/${id}?region=${region}`).then((d) => !off && (setG(d), setErr(null))).catch((e) => !off && setErr(e.status === 404 ? "notfound" : e.message));
    return () => { off = true; };
  }, [id, region, version]);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  useEffect(() => { if (g) document.title = `${g.title} — prices, history & editions | PlayRadar`; }, [g && g.title]);

  const storeNames = useMemo(() => Object.fromEntries(Object.entries(meta ? meta.stores : {}).map(([k, v]) => [k, v.name])), [meta]);
  if (err === "notfound") return <main id="main" className="wrap"><div className="empty" style={{ marginTop: 60 }}><h3>Game not found</h3><p><Link to="/browse" className="link-more">Browse all games</Link></p></div></main>;
  if (!g) return <main id="main" className="wrap"><p className="muted" style={{ padding: 80 }}>{err || "Loading…"}</p></main>;

  const regionName = meta ? meta.regions.find((r) => r.code === region)?.name : region;
  const best = g.official;
  const inList = wishlist.find((w) => w.id === g.id);
  const releaseLong = g.release.length === 4 ? g.release : fmtDate(g.release, { month: "long", day: "numeric", year: "numeric" });
  const hasHistory = g.history.official.length > 0 && !g.upcoming;

  const toggleList = () => {
    if (inList) { setWishlist((l) => l.filter((w) => w.id !== g.id)); toast(`${g.title} removed from your list`, "bookmark"); }
    else { setWishlist((l) => [{ id: g.id, target: null, alert: false, added: new Date().toISOString().slice(0, 10) }, ...l]); toast(`${g.title} added to your list`, "bookmark-check"); }
  };
  const out = (url, name) => { window.open(url, "_blank", "noopener,noreferrer"); toast(`Opening the page on <b>${name}</b> (new tab)`, "external-link"); };

  /* ---------- decision card ---------- */
  let why, gauge = null, cta;
  const alertBtn = (primary) => <button className={"btn " + (primary ? "btn--primary" : "btn--ghost")} onClick={() => setDialog(true)}><Icon name="bell-plus" />Create an alert</button>;
  if (!best) {
    why = <>Expected in <b>{releaseLong}</b>. The price has not been announced: PlayRadar tells you as soon as pre-orders open.</>;
    cta = alertBtn(true);
  } else if (g.upcoming) {
    why = <>Releases <b>{releaseLong}</b>. {g.discount > 0 ? <>Pre-order at <b>{pct(g.discount)}</b>.</> : "Same launch price on the stores tracked."}</>;
    cta = <><button className="btn btn--primary" onClick={() => out(g.offers[0].url, g.offers[0].name)}>Pre-order <Icon name="arrow-up-right" /></button>{alertBtn(false)}</>;
  } else {
    const p = Math.max(0, Math.min(100, ((best.price - g.low.price) / (g.base - g.low.price || 1)) * 100));
    if (!g.neverSold) gauge = (
      <div className="gauge" style={{ "--p": p + "%" }} role="img" aria-label="Current price between all-time low and regular price">
        <span className="gauge__pin" />
        <div className="gauge__ends"><span>Low {usd(g.low.price)}</span><span>Regular {usd(g.base)}</span></div>
      </div>
    );
    why = g.verdict === "new" ? <><b>Never on sale</b> since release: the launch price is the only price on record. Set an alert for the first discount.</>
      : g.verdict === "wait" ? <>The best price is <b>{g.gap}% above</b> the all-time low ({usd(g.low.price)}{g.low.t ? ", " + fmtDate(g.low.t, { month: "long", year: "numeric" }) : ""}). On sale {g.saleCount} time{g.saleCount !== 1 ? "s" : ""} in 12 months: a drop is likely.</>
      : g.isLow ? <><b>All-time low reached</b>: this game has never been cheaper on an official store in {regionName}.</>
      : <>Only <b>{g.gap}%</b> above the all-time low ({usd(g.low.price)}).</>;
    const first = g.verdict !== "buy";
    const offerBtn = <button className={"btn " + (first ? "btn--ghost" : "btn--primary")} onClick={() => out(g.offers[0].url, g.offers[0].name)}>View offer <Icon name="arrow-up-right" /></button>;
    cta = first ? <>{alertBtn(true)}{offerBtn}</> : <>{offerBtn}{alertBtn(false)}</>;
  }

  const sections = [["prices", "Prices"], ["regions", "Regions"], hasHistory && ["history", "History"], g.editions && ["editions", "Editions"], ["about", "About"], g.requirements.min && ["specs", "System requirements"], g.updates.length > 0 && ["news", "News"]].filter(Boolean);
  const lowKey = g.keyLow ? g.keyLow.price : null;
  const histStats = hasHistory ? (
    <div className="stats">
      <div className="stat"><small>Current price</small><b className="t-radar">{usd(best.price)}</b></div>
      <div className="stat"><small>All-time low</small><b className="t-signal">{usd(g.low.price)}</b></div>
      <div className="stat"><small>Average ({months} mo.)</small><b>{usd(averagePrice(g.history.official, months))}</b></div>
      <div className="stat"><small>Sales (12 mo.)</small><b>{g.saleCount}</b></div>
    </div>
  ) : null;

  return (
    <main id="main" className="jeu-page">
      <section className="game-hero has-art" aria-labelledby="game-h">
        <div className="game-hero__art" aria-hidden="true"><img src={g.img.hero} alt="" /></div>
        <div className="wrap game-hero__in">
          <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><Icon name="chevron-right" /><Link to="/browse">Games</Link><Icon name="chevron-right" /><span>{g.title}</span></nav>
          <div className="game-hero__grid">
            <Cover game={g} className="cover game-hero__cover enter" style={{ "--i": 0 }} />
            <div className="game-hero__info">
              <div className="game-hero__tags enter" style={{ "--i": 1 }}>{g.platforms.map((p) => <span key={p} className="plat">{p}</span>)}<Pegi g={g} /></div>
              <h1 id="game-h" className="enter" style={{ "--i": 1 }}>{g.title}{g.edition && <small>{g.edition}</small>}</h1>
              <p className="game-hero__meta enter" style={{ "--i": 2 }}>
                <span><Link to={`/browse?q=${encodeURIComponent(g.studio)}`}>{g.studio}</Link></span>
                {g.publisher !== g.studio && <span>{g.publisher}</span>}
                {g.genres.length > 0 && <span>{g.genres.join(", ")}</span>}
                <span>{g.upcoming ? (g.release.length === 4 ? "Releases " : "Releases on ") : "Released "}{g.release.length === 4 ? g.release : fmtDate(g.release)}</span>
              </p>
              <p className="game-hero__tagline enter" style={{ "--i": 2 }}>{g.tagline}</p>
              <div className="game-hero__actions enter" style={{ "--i": 3 }}>
                <button className={"btn btn--ghost" + (inList ? " is-in" : "")} onClick={toggleList}><Icon name={inList ? "bookmark-check" : "bookmark"} /><span>{inList ? "In my list" : "Add to my list"}</span></button>
                {g.editions && <a className="btn btn--ghost" href="#editions"><Icon name="layers" />Compare editions</a>}
                {g.links.steamdb && <a className="btn btn--ghost" href={g.links.steamdb} target="_blank" rel="noopener noreferrer"><Icon name="chart-line" />SteamDB</a>}
              </div>
            </div>
            <aside className="decide enter" style={{ "--i": 3 }}>
              <div className="decide__label"><span>{!best ? "Upcoming" : g.upcoming ? "Pre-order" : `Best official price · ${region.toUpperCase()}`}</span>{<Verdict g={g} /> || null}{g.upcoming && <PreorderBadge g={g} />}</div>
              {best ? (
                <>
                  <div className="decide__price"><span className="price">{usd(best.price)}</span></div>
                  <div className="decide__store"><StoreChip id={best.store} />{g.discount > 0 && <span className="badge badge--signal">{pct(g.discount)}</span>}</div>
                </>
              ) : <div className="decide__price"><span className="price price--tba">Price TBA</span></div>}
              {g.key && (
                <p className="decide__key"><Icon name="tag" />Keys from <b className="price">{usd(g.key.price)}</b>{g.key.saving > 0 && <span className="t-radar"> · {g.key.saving}% less</span>}<small>same price in every region</small></p>
              )}
              {gauge}
              <p className="decide__why">{why}</p>
              <div className="decide__cta">{cta}</div>
              <p className="decide__time"><Icon name="clock" />{g.updatedAt ? `Updated ${timeAgo(g.updatedAt)}` : "Not updated yet"} · {g.live ? "Steam price is live" : "sample prices"}</p>
            </aside>
          </div>
        </div>
      </section>

      <nav className="subnav" aria-label="Sections"><div className="wrap subnav__in">{sections.map(([sid, l]) => <a key={sid} href={`#${sid}`}>{l}</a>)}</div></nav>

      <div className="wrap game-body">
        <div className="game-main">
          <section className="panel" id="prices" aria-labelledby="prices-h">
            <div className="panel__head"><div><h2 id="prices-h">Official stores</h2><p className="panel__sub">Prices for <b>{regionName}</b> — they change with the region you buy from</p></div></div>
            <div style={{ overflowX: "auto" }}>
              <table className="ptable">
                <thead><tr><th>Store</th><th>Platform</th><th className="num">Price (USD)</th><th className="num">Discount</th><th className="num">Updated</th><th><span hidden>Action</span></th></tr></thead>
                <tbody>
                  {g.offers.length ? g.offers.map((o, i) => (
                    <tr key={o.store} className={i === 0 ? "is-best" : ""}>
                      <td><StoreChip id={o.store} />{i === 0 && <span className="best-tag">Best price</span>}</td>
                      <td className="muted">{o.platforms.join(", ")}</td>
                      <td className="num price">{usd(o.price)}<SourceDot src={o.src} />{o.local && o.local.currency !== "USD" && <small className="localp">{o.local.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {o.local.currency}</small>}</td>
                      <td className="num">{o.discount > 0 ? <span className="badge badge--signal">{pct(o.discount)}</span> : <span className="muted">—</span>}</td>
                      <td className="num alt">{timeAgo(o.at)}</td>
                      <td className="num"><button className="btn btn--ghost btn--sm" onClick={() => out(o.url, o.name)}><span>View offer</span><Icon name="arrow-up-right" /></button></td>
                    </tr>
                  )) : <tr><td colSpan="6" className="muted">No store lists this game yet.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="panel__head panel__head--sub"><div><h3 className="h3">Key shops</h3><p className="panel__sub">One global price — the same whatever your region. Check the key's region restrictions before buying.</p></div></div>
            <div style={{ overflowX: "auto" }}>
              <table className="ptable">
                <thead><tr><th>Shop</th><th className="num">Price (USD)</th><th className="num">vs. best official</th><th className="num">Updated</th><th><span hidden>Action</span></th></tr></thead>
                <tbody>
                  {g.keys.length ? g.keys.map((o, i) => (
                    <tr key={o.store} className={i === 0 ? "is-best" : ""}>
                      <td><StoreChip id={o.store} />{i === 0 && <span className="best-tag">Cheapest key</span>}</td>
                      <td className="num price">{usd(o.price)}<SourceDot src={o.src} /></td>
                      <td className="num">{best && o.price < best.price ? <span className="badge badge--radar">−{Math.round((1 - o.price / best.price) * 100)}%</span> : <span className="muted">—</span>}</td>
                      <td className="num alt">{timeAgo(o.at)}</td>
                      <td className="num"><button className="btn btn--ghost btn--sm" onClick={() => out(o.url, o.name)}><span>View key</span><Icon name="arrow-up-right" /></button></td>
                    </tr>
                  )) : <tr><td colSpan="5" className="muted">No key offers for this game.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="ptable-note"><Icon name="info" /><span><i className="real-dot" /> Live price from the store's public API. <i className="sample-dot" /> Sample price (no public API connected for this store — see README). Local-currency amounts are converted to USD at indicative exchange rates. Compare with <a href={g.links.ggdeals} target="_blank" rel="noopener noreferrer">gg.deals</a>.</span></p>
          </section>

          <section className="panel" id="regions" aria-labelledby="reg-h">
            <div className="panel__head"><div><h2 id="reg-h">Steam price by region</h2><p className="panel__sub">Same game, different regional prices — converted to USD, compared with the US price</p></div></div>
            <div style={{ overflowX: "auto" }}>
              <table className="ptable">
                <thead><tr><th>Region</th><th className="num">Local price</th><th className="num">In USD</th><th className="num">vs. US</th><th className="num">Best official</th></tr></thead>
                <tbody>
                  {g.regions.map((r) => (
                    <tr key={r.code} className={r.code === region ? "is-best" : ""}>
                      <td>{r.name}{r.code === region && <span className="best-tag">Selected</span>}</td>
                      <td className="num alt">{r.steam && r.steam.local ? `${r.steam.local.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${r.steam.local.currency}` : "—"}</td>
                      <td className="num price">{r.steam ? usd(r.steam.price) : "—"}{r.steam && <SourceDot src={r.steam.src} />}</td>
                      <td className="num">{r.steam && r.steam.vsUs != null ? (r.steam.vsUs === 0 ? <span className="muted">—</span> : <span className={r.steam.vsUs < 0 ? "t-radar" : "t-signal"}>{r.steam.vsUs > 0 ? "+" : "−"}{Math.abs(r.steam.vsUs)}%</span>) : "—"}</td>
                      <td className="num">{r.best ? <>{usd(r.best.price)} <small className="muted">{storeNames[r.best.store]}</small></> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ptable-note"><Icon name="info" /><span>You can only buy at the price of the region your store account belongs to. Prices are shown for comparison.</span></p>
          </section>

          {hasHistory && (
            <section className="panel" id="history" aria-labelledby="hist-h">
              <div className="panel__head">
                <div><h2 id="hist-h">Price history</h2><p className="panel__sub">Best official price in {regionName}{showKeys && g.history.key.length ? " and best key price" : ""} — recorded changes append automatically</p></div>
                <div className="seg" role="group" aria-label="Period">
                  {[3, 6, 12].map((m) => <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}>{m} mo.</button>)}
                </div>
              </div>
              <PriceChart official={g.history.official} keys={g.history.key} months={months} low={g.low.price} showKeys={showKeys} storeNames={storeNames} title={`Price history of ${g.title}, ${months} months`} />
              <div className="chart-legend">
                <span><i />Best official price</span>
                {g.history.key.length > 0 && <button type="button" className={"legend-toggle" + (showKeys ? " is-on" : "")} onClick={() => setShowKeys((v) => !v)}><i className="key" />Best key price{lowKey ? ` (low ${usd(lowKey)})` : ""}</button>}
                <span><i className="dash" />All-time low: {usd(g.low.price)}</span>
              </div>
              {histStats}
              <p className="ptable-note"><Icon name="info" /><span>History before the first live check is illustrative; real changes are recorded from the moment the watcher runs.</span></p>
            </section>
          )}

          {g.editions && (
            <section className="panel" id="editions" aria-labelledby="ed-h">
              <div className="panel__head"><div><h2 id="ed-h">Editions{g.upcoming ? " and pre-orders" : ""}</h2><p className="panel__sub">Reference prices for {regionName}</p></div></div>
              <div className="editions">
                {g.editions.map((e, i) => (
                  <article key={e.id} className="edition">
                    <div className="edition__head"><h3>{e.name}</h3></div>
                    <div className="edition__price">{usd(e.price)}</div>
                    {i === 0 && best && <p className="edition__best">Best price: <span className="price">{usd(best.price)}</span></p>}
                    {i > 0 && g.editions[0].price > 0 && <p className="edition__best">+{usd(e.price - g.editions[0].price)} vs. Standard</p>}
                    <ul>{e.perks.map((p) => <li key={p}><Icon name="check" />{p}</li>)}</ul>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="panel" id="about" aria-labelledby="ab-h">
            <div className="panel__head"><div><h2 id="ab-h">About the game</h2></div></div>
            <p className="about">{g.description}</p>
          </section>

          {g.requirements.min && (
            <section className="panel" id="specs" aria-labelledby="cfg-h">
              <div className="panel__head"><div><h2 id="cfg-h">System requirements (PC)</h2><p className="panel__sub">Source: official Steam page</p></div></div>
              <div className="req">
                {[["Minimum", g.requirements.min], ["Recommended", g.requirements.rec]].filter(([, r]) => r).map(([t, r]) => (
                  <div key={t}><h3>{t}</h3><dl>{Object.entries(r).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>
                ))}
              </div>
            </section>
          )}

          {g.updates.length > 0 && (
            <section className="panel" id="news" aria-labelledby="maj-h">
              <div className="panel__head"><div><h2 id="maj-h">Updates and news</h2><p className="panel__sub">Official announcements published on Steam</p></div></div>
              <div className="timeline">
                {g.updates.map((u) => (
                  <article key={u.url} className="tl-item">
                    <p className="tl-ver">{fmtDate(u.date, { month: "short", day: "numeric" })}<small>{u.date.slice(0, 4)}</small></p>
                    <div><h3>{u.title}</h3><p className="tl-text">{u.text}…</p><a className="link-more" href={u.url} target="_blank" rel="noopener noreferrer">Read the announcement <Icon name="arrow-up-right" /></a></div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="game-side">
          <section className="side-card" aria-labelledby="facts-h">
            <h2 id="facts-h"><Icon name="info" />Key facts</h2>
            <dl className="facts">
              <dt>Developer</dt><dd>{g.studio}{g.studioCity ? ` (${g.studioCity})` : ""}</dd>
              <dt>Publisher</dt><dd>{g.publisher}</dd>
              <dt>Release (PC)</dt><dd>{g.release.length === 4 ? g.release : fmtDate(g.release)}</dd>
              {g.pegi && <><dt>Rating</dt><dd>PEGI {g.pegi}</dd></>}
              {g.hours && <><dt>Main story</dt><dd>≈ {g.hours} h</dd></>}
            </dl>
            {g.pegiDesc && <p className="facts__note">{g.pegiDesc}</p>}
          </section>
          <section className="side-card" aria-labelledby="how-h2">
            <h2 id="how-h2"><Icon name="globe" />Regions and keys</h2>
            <p>Official stores price a game per region ({regionName} shown). Key shops sell activation keys at <b>one price worldwide</b>{g.key ? <>: from <b>{usd(g.key.price)}</b></> : ""}.</p>
            <div className="pay-list">
              <a href={g.links.ggdeals} target="_blank" rel="noopener noreferrer"><Icon name="tag" /><span>Compare on gg.deals<small>Keyshops and official stores</small></span><Icon name="chevron-right" /></a>
              {g.links.steamdb && <a href={g.links.steamdb} target="_blank" rel="noopener noreferrer"><Icon name="chart-line" /><span>See it on SteamDB<small>Full Steam price history</small></span><Icon name="chevron-right" /></a>}
            </div>
          </section>
        </aside>
      </div>

      <div className="mobile-buy">
        <div>{best ? <span className="price">{usd(best.price)}</span> : <span className="price">Price TBA</span>}<small>{best ? (g.discount > 0 ? pct(g.discount) + " · " : "") + (storeNames[best.store] || "") : releaseLong}</small></div>
        <button className="btn btn--primary btn--sm" onClick={() => setDialog(true)}><Icon name="bell-plus" />Alert</button>
      </div>

      {dialog && (
        <AlertDialog
          game={g}
          initial={inList ? inList.target : null}
          onClose={() => setDialog(false)}
          onSave={(v) => {
            setWishlist((l) => (l.some((w) => w.id === g.id) ? l.map((w) => (w.id === g.id ? { ...w, target: v, alert: true } : w)) : [{ id: g.id, target: v, alert: true, added: new Date().toISOString().slice(0, 10) }, ...l]));
            toast(`Alert created: you'll be notified when <b>${g.title}</b> drops below ${usd(v)}`, "bell-ring");
          }}
        />
      )}
    </main>
  );
}
