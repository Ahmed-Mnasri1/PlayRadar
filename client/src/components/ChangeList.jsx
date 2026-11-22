import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { usd, timeAgo } from "../lib.js";

/** Feed of detected price changes (home page and /changes). */
export default function ChangeList({ changes, compact }) {
  if (!changes.length)
    return (
      <div className="empty">
        <h3>No change detected yet</h3>
        <p>The watcher checks the stores regularly. New price changes will appear here by themselves.</p>
      </div>
    );
  return (
    <ul className={"changes" + (compact ? " changes--compact" : "")}>
      {changes.map((c) => {
        const down = c.to < c.from;
        return (
          <li key={c.id}>
            <Link to={`/game/${c.gameId}`} className="change">
              <span className="cover cover--xxs">
                <img className="cover__img" src={c.cover} alt="" width="150" height="225" loading="lazy" decoding="async" />
              </span>
              <span className="change__txt">
                <b>{c.title}</b>
                <small>
                  {c.storeName} · {c.kind === "key" ? "Key shop (all regions)" : c.regionName}
                  {c.src === "live" ? <i className="real-dot" title="Live price" /> : <i className="sample-dot" title="Sample price" />}
                </small>
              </span>
              <span className="change__price">
                <s>
                  <span className="sr-only">from </span>
                  {usd(c.from)}
                </s>
                <Icon name="arrow-right" />
                <b className="price">
                  <span className="sr-only">to </span>
                  {usd(c.to)}
                </b>
              </span>
              <span className={"badge " + (down ? "badge--radar" : "badge--signal")}>
                {c.pct > 0 ? "+" : "−"}
                {Math.abs(c.pct)}%
              </span>
              <time className="change__time" dateTime={new Date(c.t).toISOString()}>
                {timeAgo(c.t)}
              </time>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
