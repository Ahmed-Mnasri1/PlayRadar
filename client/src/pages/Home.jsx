import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../hooks/useApp.js";
import { useApi } from "../hooks/useApi.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { usd, pct, storeName } from "../lib.js";
import Icon from "../components/Icon.jsx";
import Cover, { CoverImg } from "../components/Cover.jsx";
import GameCard from "../components/GameCard.jsx";
import ChangeList from "../components/ChangeList.jsx";
import { Verdict } from "../components/Badges.jsx";
import { CardGridSkeleton, Loading, RowsSkeleton, Skeleton } from "../components/Skeleton.jsx";

/** Games shown as blips on the animated radar, with their position (%) and label. */
const BLIPS = [
  {
    id: "gta-v",
    x: 70,
    y: 22,
    tag: () => (
      <span className="badge badge--line blip__tag" style={{ background: "var(--panel)" }}>
        Update
      </span>
    ),
  },
  { id: "fable", x: 24, y: 30, left: true, tag: () => <span className="badge badge--signal blip__tag">Pre-order</span> },
  { id: "no-mans-sky", x: 76, y: 66, tag: (g) => <span className="badge badge--radar blip__tag">{pct(g.discount)}</span> },
  {
    id: "lego-star-wars",
    x: 30,
    y: 74,
    left: true,
    tag: () => (
      <span className="badge badge--low blip__tag" style={{ background: "var(--panel)" }}>
        All-time low
      </span>
    ),
  },
  { id: "hollow-knight-silksong", x: 47, y: 46, tag: () => null },
];

const PICKS = ["gta-v", ...BLIPS.map((b) => b.id)].join(",");

export default function Home() {
  const { region, version, meta } = useApp();
  // Each section asks the server for exactly what it shows (the catalog has hundreds of games).
  const r = `/games?region=${region}`;
  const { data: picks } = useApi(`${r}&ids=${PICKS}`, version); // featured game + radar blips
  const { data: dealsData } = useApi(`${r}&promo=1&when=out&sort=discount&limit=6`, version);
  const { data: lowsData } = useApi(`${r}&low=1&limit=10`, version);
  const { data: upData } = useApi(`${r}&when=soon&sort=release&limit=6`, version);
  const { data: feed } = useApi("/changes?limit=5", version);
  useDocumentTitle("PlayRadar — The right game, at the right price, at the right time");

  const games = picks && dealsData; // first sections loaded
  const game = (id) => picks?.games.find((g) => g.id === id);
  const feat = game("gta-v");
  const deals = (dealsData?.games || []).filter((g) => g.id !== "gta-v").slice(0, 5);
  const lows = (lowsData?.games || []).filter((g) => !deals.some((d) => d.id === g.id)).slice(0, 5);
  const upcoming = upData?.games || [];
  const regionName = meta ? meta.regions.find((r) => r.code === region)?.name : "";

  return (
    <main id="main">
      <section className="hero wrap" aria-labelledby="hero-h">
        <div className="hero__copy">
          <p className="eyebrow enter" style={{ "--i": 0 }}>
            Price comparison · video games
          </p>
          <h1 className="hero__title" id="hero-h">
            <span className="line">
              <span style={{ "--i": 0 }}>The right game,</span>
            </span>
            <span className="line">
              <span style={{ "--i": 1 }}>at the right price,</span>
            </span>
            <span className="line">
              <span className="t-radar" style={{ "--i": 2 }}>
                at the right time.
              </span>
            </span>
          </h1>
          <p className="hero__lead enter" style={{ "--i": 4 }}>
            PlayRadar compares official stores — whose prices change with your region — and key shops, which sell at one price worldwide.
            History for every price, refreshed automatically. Everything in US dollars.
          </p>
          <HeroSearch />
          <div className="hero__chips chips enter" style={{ "--i": 6 }}>
            <Link className="chip" to="/browse?plat=PC">
              PC
            </Link>
            <Link className="chip" to="/browse?plat=PS5">
              PS5
            </Link>
            <Link className="chip" to="/browse?plat=Xbox%20Series">
              Xbox Series
            </Link>
            <Link className="chip" to="/browse?max=20">
              Under $20
            </Link>
            <Link className="chip" to="/browse?low=1">
              All-time low
            </Link>
          </div>
          <ul className="hero__facts enter" style={{ "--i": 7 }}>
            <li>
              <b>{meta ? meta.regions.length : 9}</b>
              <span>store regions tracked</span>
            </li>
            <li>
              <b>Live</b>
              <span>automatic price updates</span>
            </li>
            <li>
              <b>12 mo.</b>
              <span>of history per game</span>
            </li>
          </ul>
        </div>

        <div className="radar" aria-hidden="true">
          <div className="radar__disc" />
          <svg className="radar__grid" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth=".25">
            <circle cx="50" cy="50" r="49.5" />
            <circle cx="50" cy="50" r="37" />
            <circle cx="50" cy="50" r="24.5" />
            <circle cx="50" cy="50" r="12" />
            <path d="M50 .5V99.5M.5 50H99.5" strokeDasharray=".8 1.2" />
          </svg>
          <div className="radar__sweep" />
          <div className="radar__core" />
          <div>
            {BLIPS.map((b) => {
              const g = game(b.id);
              if (!g) return null;
              // blips light up when the sweep passes over them
              const a = (Math.atan2(b.x - 50, -(b.y - 50)) * 180) / Math.PI;
              const delay = (((a + 360) % 360) / 360) * 6;
              return (
                <div
                  key={b.id}
                  className={"blip " + (b.left ? "blip--left" : "")}
                  style={{ "--x": b.x + "%", "--y": b.y + "%", "--d": delay.toFixed(2) + "s" }}
                >
                  <div className="blip__dot">
                    <div className="cover">
                      <CoverImg game={g} size="xs" />
                    </div>
                  </div>
                  {b.tag(g)}
                </div>
              );
            })}
          </div>
          <p className="radar__legend">
            <i />
            Scanning stores…
          </p>
        </div>
      </section>

      <section className="section wrap" aria-label="Featured">
        {!games ? (
          <Skeleton h={400} r="var(--r-xl)" className="skel--block" />
        ) : (
          feat &&
          feat.official && (
            <Link className="feature" to={`/game/${feat.id}`}>
              <img
                className="feature__art"
                src={feat.img.heroSm}
                srcSet={`${feat.img.heroSm} 960w, ${feat.img.hero} 1920w`}
                sizes="(max-width: 1280px) 100vw, 1280px"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <div className="feature__copy">
                <p className="eyebrow">Featured · {regionName}</p>
                <h2>{feat.title}</h2>
                <p className="feature__lead">{feat.tagline}</p>
                <div className="feature__row">
                  <span className="feature__price">
                    <span className="price">{usd(feat.official.price)}</span>
                    <small>
                      {storeName(feat.official.store)}
                      {feat.discount > 0 ? " · " + pct(feat.discount) : ""}
                      {feat.key ? ` · keys from ${usd(feat.key.price)}` : ""}
                    </small>
                  </span>
                  <Verdict g={feat} />
                  <span className="btn btn--primary">
                    Compare prices <Icon name="arrow-right" className="m-arrow" />
                  </span>
                </div>
              </div>
              <Cover game={feat} className="cover feature__cover" alt="" />
            </Link>
          )
        )}
      </section>

      <section className="section wrap" aria-labelledby="deals-h">
        <div className="section__head">
          <div>
            <h2 id="deals-h">Today’s best deals</h2>
            <p>The biggest discounts on official stores in {regionName}. Updated automatically.</p>
          </div>
          <Link className="link-more" to="/browse?promo=1">
            All deals <Icon name="arrow-right" />
          </Link>
        </div>
        {games ? (
          <div className="grid-cards">
            {deals.map((g) => (
              <GameCard key={g.id} g={g} />
            ))}
          </div>
        ) : (
          <Loading label="Loading deals…">
            <CardGridSkeleton count={5} />
          </Loading>
        )}
      </section>

      <section className="section wrap" aria-labelledby="live-h">
        <div className="section__head">
          <div>
            <h2 id="live-h">Latest price changes</h2>
            <p>Every change detected by the watcher, as it happens.</p>
          </div>
          <Link className="link-more" to="/changes">
            See all changes <Icon name="arrow-right" />
          </Link>
        </div>
        {feed ? (
          <ChangeList changes={feed.changes} compact />
        ) : (
          <Loading label="Loading price changes…">
            <RowsSkeleton count={5} />
          </Loading>
        )}
      </section>

      {lows.length > 0 && (
        <section className="section wrap" aria-labelledby="lows-h">
          <div className="section__head">
            <div>
              <h2 id="lows-h">At their lowest price ever</h2>
              <p>Never been cheaper on an official store in {regionName}.</p>
            </div>
          </div>
          <div className="grid-cards">
            {lows.map((g) => (
              <GameCard key={g.id} g={g} />
            ))}
          </div>
        </section>
      )}

      <section className="section wrap" aria-labelledby="up-h">
        <div className="section__head">
          <div>
            <h2 id="up-h">Upcoming releases</h2>
            <p>Dates, editions and pre-order bonuses in one place.</p>
          </div>
          <Link className="link-more" to="/browse?when=soon">
            All upcoming <Icon name="arrow-right" />
          </Link>
        </div>
        <div className="upcoming">
          {!upData && [0, 1, 2].map((i) => <Skeleton key={i} h={170} r="var(--r-xl)" />)}
          {upcoming.map((g) => {
            const precise = g.release.length === 10;
            const d = precise ? new Date(g.release + "T00:00:00") : null;
            return (
              <Link key={g.id} className="ucard" to={`/game/${g.id}`}>
                <Cover game={g} alt="" sizes="112px" />
                <div className="ucard__body">
                  <div className="ucard__date">
                    <b>{precise ? `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}` : g.release}</b>
                    <span>{precise ? d.getFullYear() : "Date TBA"}</span>
                  </div>
                  <h3>{g.title}</h3>
                  <p className="ucard__meta">
                    {g.genres[0] || ""} · {g.platforms.map((p) => p.replace(" Series", "")).join(", ")}
                  </p>
                  <p className="ucard__price">
                    {g.official ? (
                      <>
                        Pre-order from <span className="price">{usd(g.official.price)}</span>
                      </>
                    ) : (
                      "Price not announced yet"
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section wrap" aria-labelledby="how-h">
        <div className="section__head">
          <h2 id="how-h">Three steps before you buy</h2>
        </div>
        <div className="how">
          <article className="step">
            <span className="step__n">01</span>
            <Icon name="search" />
            <h3>Search</h3>
            <p>A name, a studio or a genre: suggestions appear from the first letter.</p>
          </article>
          <article className="step">
            <span className="step__n">02</span>
            <Icon name="chart-line" />
            <h3>Compare</h3>
            <p>Official stores for your region, key shops, price history and a clear verdict: buy or wait.</p>
          </article>
          <article className="step">
            <span className="step__n">03</span>
            <Icon name="bell-ring" />
            <h3>Get alerted</h3>
            <p>Set a target price: you are notified the moment the game drops below it.</p>
          </article>
          <article className="local">
            <p className="eyebrow">Official vs. keys</p>
            <h3>Two kinds of prices</h3>
            <ul>
              <li>
                <Icon name="store" />
                Official stores: price depends on your region
              </li>
              <li>
                <Icon name="tag" />
                Key shops: same price in every region
              </li>
              <li>
                <Icon name="info" />
                Keys can be region-locked — check before buying
              </li>
            </ul>
            <Link className="btn btn--sm" to="/browse">
              Compare now <Icon name="arrow-right" className="m-arrow" />
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}

/** Big search box; navigates inside the app instead of reloading the page. */
function HeroSearch() {
  const nav = useNavigate();
  return (
    <form
      className="hero-search enter"
      style={{ "--i": 5 }}
      action="/browse"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q").trim();
        nav(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
      }}
    >
      <Icon name="search" />
      <input type="search" name="q" placeholder="Which game are you looking for?" aria-label="Search a game" />
      <button className="btn btn--primary btn--lg" type="submit">
        Compare prices
      </button>
    </form>
  );
}
