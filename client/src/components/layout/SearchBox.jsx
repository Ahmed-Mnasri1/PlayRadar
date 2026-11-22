import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../Icon.jsx";
import { useApp } from "../../hooks/useApp.js";
import { useApi } from "../../hooks/useApi.js";
import { usd, pct } from "../../lib.js";

/**
 * Header search with instant suggestions (ARIA combobox pattern):
 * ↑/↓ move through the options, Enter opens one, Esc closes, "/" focuses the box.
 */
export default function SearchBox() {
  const { region } = useApp();
  const nav = useNavigate();
  const uid = useId();
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

  // Suggestions come from the server (GET /api/search), 150 ms after the last keystroke.
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTyped(q.trim()), 150);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading } = useApi(open ? `/search?region=${region}&q=${encodeURIComponent(typed)}` : null);
  const nq = q.trim();
  // Suggestions for an older input are never shown: ↓ + Enter must not open the wrong game.
  const stale = loading || typed !== nq;
  const results = (!stale && data && data.games) || [];
  const studios = (!stale && nq && data && data.studios) || [];
  const all = `/browse?q=${encodeURIComponent(q.trim())}`;
  const links = [
    ...results.map((g) => `/game/${g.id}`),
    ...studios.map((s) => `/browse?q=${encodeURIComponent(s.name)}`),
    ...(nq ? [all] : []),
  ];
  const optId = (i) => `${uid}-opt-${i}`;
  const go = (to) => {
    setOpen(false);
    setQ("");
    setIdx(-1);
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
        go(idx >= 0 ? links[idx] : all);
      }}
    >
      <Icon name="search" className="search__icon" />
      <input
        ref={input}
        className="search__input"
        type="search"
        placeholder="Search a game or a studio…"
        aria-label="Search a game or a studio"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-activedescendant={open && idx >= 0 ? optId(idx) : undefined}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => (setQ(e.target.value), setOpen(true), setIdx(-1))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setIdx((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % Math.max(1, links.length));
          } else if (e.key === "Escape") {
            setOpen(false);
            e.target.blur();
          }
        }}
      />
      <kbd className="search__kbd" aria-hidden="true">
        /
      </kbd>
      <div className="suggest" id={`${uid}-list`} role="listbox" aria-label="Suggestions" hidden={!open}>
        <p className="suggest__label" aria-hidden="true">
          {nq ? "Games" : "Hot deals right now"}
        </p>
        {results.length ? (
          results.map((g, i) => (
            <Link
              key={g.id}
              id={optId(i)}
              className={"suggest__item" + (idx === i ? " is-active" : "")}
              role="option"
              aria-selected={idx === i}
              to={`/game/${g.id}`}
              onClick={(e) => (e.preventDefault(), go(`/game/${g.id}`))}
            >
              <span className="cover cover--xxs">
                <img className="cover__img" src={g.img.coverSm} alt="" width="150" height="225" />
              </span>
              <span className="suggest__txt">
                <b>{g.title}</b>
                <small>
                  {g.studio} · {g.platforms.join(", ")}
                </small>
              </span>
              <span className="suggest__price">
                {g.official ? <span className="price">{usd(g.official.price)}</span> : <small>Price TBA</small>}
                {g.discount > 0 && <small className="t-signal">{pct(g.discount)}</small>}
              </span>
            </Link>
          ))
        ) : (
          <p className="suggest__empty">{stale ? "Searching…" : `No game matches “${q}”.`}</p>
        )}
        {studios.length > 0 && (
          <p className="suggest__label" aria-hidden="true">
            Studios
          </p>
        )}
        {studios.map((s, i) => {
          const to = `/browse?q=${encodeURIComponent(s.name)}`;
          const n = results.length + i;
          return (
            <Link
              key={s.name}
              id={optId(n)}
              className={"suggest__item suggest__item--studio" + (idx === n ? " is-active" : "")}
              role="option"
              aria-selected={idx === n}
              to={to}
              onClick={(e) => (e.preventDefault(), go(to))}
            >
              <Icon name="users" />
              <span className="suggest__txt">
                <b>{s.name}</b>
                <small>{s.count} game(s)</small>
              </span>
            </Link>
          );
        })}
        {nq && (
          <Link
            id={optId(links.length - 1)}
            className={"suggest__all" + (idx === links.length - 1 ? " is-active" : "")}
            role="option"
            aria-selected={idx === links.length - 1}
            to={all}
            onClick={(e) => (e.preventDefault(), go(all))}
          >
            See all results for “{q}” <Icon name="arrow-right" />
          </Link>
        )}
      </div>
    </form>
  );
}
