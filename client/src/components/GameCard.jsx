import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { CoverImg } from "./Cover.jsx";
import { DiscountBadge, LowBadge, PreorderBadge } from "./Badges.jsx";
import { usd, fmtDate, storeName } from "../lib.js";

const shortPlatforms = (g) => g.platforms.map((p) => p.replace(" Series", "")).join(" · ");

/**
 * Game tile used in every grid (home, search). The whole card is one link.
 * `eager`: load the cover immediately (cards visible on first paint).
 */
export default function GameCard({ g, eager = false }) {
  const date = g.upcoming
    ? `Releases ${g.release.length === 4 ? g.release : fmtDate(g.release, { month: "long", day: "numeric" })}`
    : g.genres[0] || "";
  return (
    <article className="gcard">
      <Link className="gcard__link" to={`/game/${g.id}`}>
        <div className="cover gcard__cover">
          <CoverImg game={g} eager={eager} />
          <div className="gcard__badges">
            <DiscountBadge g={g} />
            <PreorderBadge g={g} />
          </div>
        </div>
        <div className="gcard__body">
          <div className="gcard__meta">
            <span>{date}</span>
            <span className="gcard__plat">{shortPlatforms(g)}</span>
          </div>
          <h3 className="gcard__title">{g.title}</h3>
          <div className="gcard__price">
            {g.official ? <span className="price">{usd(g.official.price)}</span> : <span className="price price--tba">Price TBA</span>}
            {g.discount > 0 && (
              <s className="was">
                <span className="sr-only">Regular price </span>
                {usd(g.base)}
              </s>
            )}
          </div>
          <div className="gcard__foot">
            {g.isLow ? (
              <LowBadge g={g} />
            ) : (
              <span className="gcard__store">{g.official ? storeName(g.official.store) : "Alert when pre-orders open"}</span>
            )}
            {g.key && (
              <span className="gcard__key" title="Cheapest key (same price in every region)">
                <Icon name="tag" />
                Keys {usd(g.key.price)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
