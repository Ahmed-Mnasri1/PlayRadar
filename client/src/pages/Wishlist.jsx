import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../hooks/useApp.js";
import { useApi } from "../hooks/useApi.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { api, usd, fmtDate, timeAgo, storeName } from "../lib.js";
import Icon from "../components/Icon.jsx";
import Cover, { CoverImg } from "../components/Cover.jsx";
import { Sparkline } from "../components/charts.jsx";
import { ListSkeleton } from "../components/Skeleton.jsx";

export default function Wishlist() {
  const { games, game, wishlist, listReady, saveItem, removeItem, prefs, setPrefs, toast, version, region } = useApp();
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("close");
  const [histories, setHistories] = useState({});
  const { data: feedData } = useApi("/changes?limit=40", version);
  const feed = feedData ? feedData.changes : [];
  useDocumentTitle("My list and alerts — PlayRadar");
  const ids = wishlist.map((w) => w.id).join(",");

  // 90-day sparklines come from the game detail endpoint
  useEffect(() => {
    let off = false;
    Promise.all(
      ids
        .split(",")
        .filter(Boolean)
        .map((id) =>
          api(`/games/${id}?region=${region}`)
            .then((d) => [id, d.history.official])
            .catch(() => [id, []])
        )
    ).then((r) => !off && setHistories(Object.fromEntries(r)));
    return () => {
      off = true;
    };
  }, [ids, region, version]);

  const items = useMemo(
    () =>
      wishlist
        .map((e) => {
          const g = game(e.id);
          if (!g) return null;
          const now = g.official ? g.official.price : null;
          const hit = !g.upcoming && e.target != null && now != null && now <= e.target;
          return {
            e,
            g,
            now,
            hit,
            state: g.upcoming ? "soon" : hit ? "hit" : "wait",
            close: e.target && now ? Math.min(100, (e.target / now) * 100) : 0,
          };
        })
        .filter(Boolean),
    [wishlist, game]
  );

  const hits = items.filter((i) => i.hit && i.e.alert);
  const saved = items.filter((i) => !i.g.upcoming && i.now).reduce((s, i) => s + (i.g.base - i.now), 0);
  const sorters = {
    close: (a, b) => b.hit - a.hit || b.close - a.close,
    added: (a, b) => b.e.added.localeCompare(a.e.added),
    price: (a, b) => (a.now ?? 1e9) - (b.now ?? 1e9),
  };
  const shown = items.filter((i) => tab === "all" || i.state === tab).sort(sorters[sort]);
  const update = (id, patch) => saveItem(id, patch);
  const watched = new Set(wishlist.map((w) => w.id));
  const myFeed = feed.filter((c) => watched.has(c.gameId)).slice(0, 6);

  if (!games || (!listReady && !wishlist.length)) return <ListSkeleton />;

  return (
    <main id="main" className="wrap list-page">
      <div className="page-head">
        <div>
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <Icon name="chevron-right" />
            <span>My list</span>
          </nav>
          <h1 style={{ marginTop: 12 }}>My list</h1>
          <p>
            Your tracked games and target prices (in US dollars, official stores in your region). Alerts fire in the page as soon as a price
            crosses your target.
          </p>
        </div>
        <Link className="btn btn--ghost" to="/browse">
          <Icon name="plus" />
          Add a game
        </Link>
      </div>

      <div className="kpis">
        <div className="kpi">
          <small>
            <Icon name="bookmark" />
            Games tracked
          </small>
          <b>{items.length}</b>
        </div>
        <div className="kpi">
          <small>
            <Icon name="bell" />
            Active alerts
          </small>
          <b>{items.filter((i) => i.e.alert).length}</b>
        </div>
        <div className="kpi kpi--hot">
          <small>
            <Icon name="bell-ring" />
            Under your target
          </small>
          <b>{hits.length}</b>
        </div>
        <div className="kpi">
          <small>
            <Icon name="trending-down" />
            Savings vs. regular price
          </small>
          <b className="t-radar">{usd(saved)}</b>
        </div>
      </div>

      {hits.length > 0 && (
        <div className="hits">
          <div className="hits__head">
            <Icon name="bell-ring" />
            {hits.length} alert{hits.length > 1 ? "s" : ""} triggered<small>prices checked live</small>
          </div>
          {hits.map((i) => (
            <div className="hit" key={i.g.id}>
              <Cover game={i.g} size="xxs" />
              <p>
                <b>{i.g.title}</b> is <b className="t-radar">{usd(i.now)}</b> on {storeName(i.g.official.store)}, under your target of{" "}
                {usd(i.e.target)}.
              </p>
              <Link className="btn btn--primary btn--sm" to={`/game/${i.g.id}`}>
                View offer <Icon name="arrow-up-right" />
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="list-layout">
        <section aria-labelledby="rows-h">
          <h2 id="rows-h" hidden>
            Tracked games
          </h2>
          <div className="list-bar">
            <div className="seg" role="group" aria-label="Filter the list">
              {[
                ["all", "All"],
                ["hit", "Under target"],
                ["wait", "Waiting"],
                ["soon", "Upcoming"],
              ].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={tab === v} onClick={() => setTab(v)}>
                  {l}
                </button>
              ))}
            </div>
            <label className="select">
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort the list">
                <option value="close">Closest to target</option>
                <option value="added">Recently added</option>
                <option value="price">Price: low to high</option>
              </select>
              <Icon name="chevron-down" />
            </label>
          </div>
          <div className="rows">
            {shown.length ? (
              shown.map(({ e, g, now, hit, close }) => (
                <article key={g.id} className={"wrow" + (hit ? " is-hit" : "") + (e.alert ? "" : " is-off")}>
                  <Link className="cover" to={`/game/${g.id}`} aria-hidden="true" tabIndex={-1}>
                    <CoverImg game={g} size="xs" />
                  </Link>
                  <div className="wrow__title">
                    <Link to={`/game/${g.id}`}>{g.title}</Link>
                    <small>
                      Added {fmtDate(e.added, { month: "short", day: "numeric" })} ·{" "}
                      {g.platforms.map((p) => p.replace(" Series", "")).join(", ")}
                    </small>
                  </div>
                  <Sparkline steps={histories[g.id]} />
                  <div className="wrow__now">
                    {now != null ? <span className="price">{usd(now)}</span> : <span className="price">—</span>}
                    <small>
                      {g.upcoming ? "Pre-order · " : ""}
                      {g.official ? storeName(g.official.store) : "Price TBA"}
                    </small>
                  </div>
                  <div className="target">
                    <div className="target__row">
                      <span>My target</span>
                      {!g.upcoming && (
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          defaultValue={e.target ?? ""}
                          key={e.target}
                          placeholder="—"
                          aria-label={`Target price for ${g.title} in dollars`}
                          onBlur={(ev) => {
                            const v = parseFloat(ev.target.value);
                            const nv = isNaN(v) ? null : v;
                            if (nv !== e.target) {
                              update(g.id, { target: nv, alert: nv != null ? true : e.alert });
                              toast(
                                nv == null ? (
                                  "Target removed"
                                ) : (
                                  <>
                                    New target: {usd(nv)} for <b>{g.title}</b>
                                  </>
                                ),
                                "target"
                              );
                            }
                          }}
                          onKeyDown={(ev) => ev.key === "Enter" && ev.target.blur()}
                        />
                      )}
                    </div>
                    <div className="bar">
                      <i style={{ "--w": (g.upcoming ? 0 : close) + "%" }} />
                    </div>
                    {g.upcoming ? (
                      <span className="status" style={{ color: "var(--sky)" }}>
                        Alert on release · {g.release.length === 4 ? g.release : fmtDate(g.release, { month: "short", day: "numeric" })}
                      </span>
                    ) : e.target == null ? (
                      <span className="status muted">No target price</span>
                    ) : hit ? (
                      <span className="status t-radar">✓ Under target</span>
                    ) : (
                      <span className="status t-signal">{usd(now - e.target)} more to drop</span>
                    )}
                  </div>
                  <label className="switch" title="Alert">
                    <input
                      type="checkbox"
                      checked={e.alert}
                      aria-label={`Alert for ${g.title}`}
                      onChange={(ev) => {
                        update(g.id, { alert: ev.target.checked });
                        toast(ev.target.checked ? "Alert enabled" : "Alert paused", "bell");
                      }}
                    />
                    <span />
                  </label>
                  <button
                    className="icon-btn"
                    type="button"
                    aria-label={`Remove ${g.title} from my list`}
                    onClick={() => {
                      removeItem(g.id);
                      toast(
                        <>
                          <b>{g.title}</b> removed from your list
                        </>,
                        "trash-2"
                      );
                    }}
                  >
                    <Icon name="trash-2" />
                  </button>
                </article>
              ))
            ) : (
              <div className="empty">
                <h3>Nothing here yet</h3>
                <p>Add a game from its page with “Add to my list”.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="game-side" id="alerts" style={{ top: "calc(var(--header-h) + 24px)" }}>
          <section className="side-card prefs" aria-labelledby="pref-h">
            <h2 id="pref-h">
              <Icon name="settings-2" />
              Alert preferences
            </h2>
            <label className="toggle-row">
              Price-drop alerts{" "}
              <span className="switch">
                <input type="checkbox" checked={prefs.drops} onChange={(e) => setPrefs({ ...prefs, drops: e.target.checked })} />
                <span />
              </span>
            </label>
            <label className="toggle-row">
              Releases from my list{" "}
              <span className="switch">
                <input type="checkbox" checked={prefs.releases} onChange={(e) => setPrefs({ ...prefs, releases: e.target.checked })} />
                <span />
              </span>
            </label>
            <p className="muted" style={{ fontSize: 12 }}>
              Alerts appear in the page while PlayRadar is open. Your list and preferences are saved on the PlayRadar server for this
              browser (no account needed).
            </p>
          </section>
          <section className="side-card" aria-labelledby="feed-h">
            <h2 id="feed-h">
              <Icon name="trending-down" />
              Changes on my games
            </h2>
            <ul className="feed">
              {myFeed.length ? (
                myFeed.map((c) => (
                  <li key={c.id}>
                    <Icon name={c.to < c.from ? "trending-down" : "trending-up"} />
                    <div>
                      <p>
                        <b>{c.title}</b> · {c.storeName}: {usd(c.from)} → {usd(c.to)}
                      </p>
                      <small>{timeAgo(c.t)}</small>
                    </div>
                  </li>
                ))
              ) : (
                <li>
                  <Icon name="info" />
                  <div>
                    <p>No change detected on your games yet. They will show up here live.</p>
                  </div>
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
