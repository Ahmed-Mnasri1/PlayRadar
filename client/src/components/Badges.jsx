// Small status labels shared by cards, the game page and the list.
import Icon from "./Icon.jsx";
import { pct } from "../lib.js";

export const DiscountBadge = ({ g }) => (g.discount > 0 ? <span className="badge badge--signal">{pct(g.discount)}</span> : null);

export const LowBadge = ({ g }) =>
  g.isLow ? (
    <span className="badge badge--low">
      <Icon name="trending-down" />
      All-time low
    </span>
  ) : null;

export const PreorderBadge = ({ g }) =>
  g.upcoming ? (
    <span className="badge badge--sky">
      <Icon name="calendar-clock" />
      {g.official ? "Pre-order" : "Announced"}
    </span>
  ) : null;

export const Pegi = ({ g }) =>
  g.pegi ? (
    <span className={"pegi pegi--" + g.pegi} title={`PEGI ${g.pegi}${g.pegiDesc ? " · " + g.pegiDesc : ""}`}>
      PEGI {g.pegi}
    </span>
  ) : null;

/** Buy-or-wait verdict computed by the server. */
export function Verdict({ g }) {
  if (g.upcoming || !g.verdict) return null;
  if (g.verdict === "buy")
    return (
      <span className="verdict verdict--buy">
        <Icon name="check" />
        Good deal
      </span>
    );
  if (g.verdict === "new")
    return (
      <span className="verdict verdict--new">
        <Icon name="info" />
        Never on sale
      </span>
    );
  return (
    <span className="verdict verdict--wait">
      <Icon name="clock" />
      Better to wait
    </span>
  );
}
