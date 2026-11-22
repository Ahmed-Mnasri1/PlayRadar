import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Cover from "./Cover.jsx";
import { usd } from "../lib.js";

/** "Create a price alert" modal (native <dialog>). Target prices are in USD. */
export default function AlertDialog({ game, initial, onClose, onSave }) {
  const ref = useRef(null);
  const ref0 = game.official ? game.official.price : 60;
  const [target, setTarget] = useState(initial ?? (game.low && !game.neverSold ? Math.floor(game.low.price) : Math.floor(ref0 * 0.8)));
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const chips =
    game.low && !game.neverSold
      ? [
          ["All-time low", game.low.price],
          ["−30%", +(game.base * 0.7).toFixed(2)],
          ["−50%", +(game.base * 0.5).toFixed(2)],
        ]
      : game.base
        ? [
            ["−20%", +(game.base * 0.8).toFixed(2)],
            ["−40%", +(game.base * 0.6).toFixed(2)],
          ]
        : [];
  const v = parseFloat(target) || 0;
  const hint = !game.official
    ? "The alert will fire as soon as a price is announced"
    : v >= game.official.price
      ? "The current price is already below this target: the alert fires right away"
      : `${usd(game.official.price - v)} more to drop`;
  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <form
        className="dialog__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (v > 0) {
            onSave(v);
            ref.current.close();
          }
        }}
      >
        <header className="dialog__head">
          <Cover game={game} size="xs" />
          <div>
            <p className="eyebrow">Price alert</p>
            <h2>{game.title}</h2>
            <p className="muted">{game.official ? `Best price now: ${usd(game.official.price)}` : "Price not announced yet"}</p>
          </div>
          <button type="button" className="icon-btn dialog__x" aria-label="Close" onClick={() => ref.current.close()}>
            <Icon name="x" />
          </button>
        </header>
        <label className="field">
          <span className="field__label">Notify me when the price drops below</span>
          <span className="field__box">
            <input
              className="field__input mono"
              type="number"
              min="1"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
              inputMode="decimal"
              autoFocus
            />
            <span className="field__unit">$</span>
          </span>
          <span className="field__hint">{hint}</span>
        </label>
        <div className="chips">
          {chips.map(([l, val]) => (
            <button type="button" key={l} className="chip" onClick={() => setTarget(val)}>
              {l} · {usd(val)}
            </button>
          ))}
        </div>
        <footer className="dialog__foot">
          <button type="button" className="btn btn--ghost" onClick={() => ref.current.close()}>
            Cancel
          </button>
          <button className="btn btn--primary" type="submit">
            <Icon name="bell-plus" />
            Create alert
          </button>
        </footer>
      </form>
    </dialog>
  );
}
