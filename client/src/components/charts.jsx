import { useEffect, useMemo, useRef, useState } from "react";
import { usd, DAY } from "../lib.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function niceTicks(min, max, n = 4) {
  const step0 = (max - min) / n || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(+v.toFixed(2));
  return ticks;
}

/** Steps visible in [start, now]; the first step is clamped to `start`. */
function visible(steps, start) {
  let i = steps.findIndex((p) => p.t > start) - 1;
  if (i < -1) i = steps.length - 1;
  const out = steps.slice(Math.max(0, i)).map((p) => ({ ...p }));
  if (out[0] && out[0].t < start) out[0].t = start;
  return out;
}

const stepPath = (pts, x, y, t1) =>
  pts
    .map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.usd).toFixed(1)} H${x(i < pts.length - 1 ? pts[i + 1].t : t1).toFixed(1)}`)
    .join(" ");

/**
 * Price history (step chart). `official` is the best official price in the
 * selected region, `keys` the best key price (global). Pure SVG, no dependency.
 */
export function PriceChart({ official, keys, months, low, showKeys, storeNames, title }) {
  const box = useRef(null);
  const [W, setW] = useState(640);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(320, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const H = 270;
  const m = { t: 18, r: 16, b: 30, l: 58 };
  const model = useMemo(() => {
    if (!official.length) return null;
    const t1 = Date.now();
    const start = Math.max(official[0].t, t1 - months * 30.44 * DAY);
    const pts = visible(official, start);
    const kpts = showKeys && keys.length ? visible(keys, start) : [];
    const all = [...pts, ...kpts].map((p) => p.usd);
    const lo = Math.min(low ?? Infinity, ...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.15 || 1;
    const yMin = Math.max(0, lo - pad);
    const yMax = hi + pad;
    return { t0: start, t1, pts, kpts, yMin, yMax };
  }, [official, keys, months, showKeys, low]);

  if (!model)
    return (
      <div className="chart-box" ref={box}>
        <p className="muted" style={{ padding: 24 }}>
          No history yet.
        </p>
      </div>
    );
  const { t0, t1, pts, kpts, yMin, yMax } = model;
  const x = (t) => m.l + ((t - t0) / (t1 - t0)) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const d = stepPath(pts, x, y, t1);
  const area = d + ` V${y(yMin)} H${x(t0)} Z`;
  const last = pts[pts.length - 1];

  const xt = [];
  const cur = new Date(t0);
  cur.setMonth(cur.getMonth() + 1, 1);
  cur.setHours(0, 0, 0, 0);
  const every = months > 6 ? 2 : 1;
  for (let k = 0; cur.getTime() < t1; k++, cur.setMonth(cur.getMonth() + 1))
    if (k % every === 0) xt.push({ t: cur.getTime(), label: MONTHS[cur.getMonth()] });

  function move(e) {
    const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const t = t0 + ((px - m.l) / (W - m.l - m.r)) * (t1 - t0);
    let p = pts[0];
    for (const q of pts) if (q.t <= t) p = q;
    let k = null;
    if (kpts.length) for (const q of kpts) if (q.t <= t) k = q;
    setHover({ cx: Math.min(Math.max(px, m.l), W - m.r), t, p, k, left: (Math.min(Math.max(px, m.l), W - m.r) / W) * r.width });
  }
  const uid = "grad" + months;

  return (
    <div className="chart-box is-drawn" ref={box} style={{ position: "relative" }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={title}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="ch-stop-a" />
            <stop offset="1" className="ch-stop-b" />
          </linearGradient>
        </defs>
        {niceTicks(yMin, yMax, 4).map((v) => (
          <g key={v}>
            <line className="ch-grid" x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
            <text className="ch-ylab" x={m.l - 10} y={y(v) + 4} textAnchor="end">
              ${Math.round(v)}
            </text>
          </g>
        ))}
        {xt.map((tk) => (
          <g key={tk.t}>
            <text className="ch-xlab" x={x(tk.t)} y={H - 8} textAnchor="middle">
              {tk.label}
            </text>
            <line className="ch-tick" x1={x(tk.t)} x2={x(tk.t)} y1={H - m.b} y2={H - m.b + 4} />
          </g>
        ))}
        <line className="ch-axis" x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} />
        <path className="ch-area" d={area} fill={`url(#${uid})`} />
        {low != null && <line className="ch-low" x1={m.l} x2={W - m.r} y1={y(low)} y2={y(low)} />}
        {kpts.length > 0 && <path className="ch-line ch-line--key" d={stepPath(kpts, x, y, t1)} />}
        <path className="ch-line" d={d} />
        <circle className="ch-now-ring" cx={x(t1)} cy={y(last.usd)} r="9" />
        <circle className="ch-now" cx={x(t1)} cy={y(last.usd)} r="4.5" />
        {hover && (
          <g>
            <line className="ch-cross" x1={hover.cx} x2={hover.cx} y1={m.t} y2={H - m.b} />
            <circle className="ch-dot" cx={hover.cx} cy={y(hover.p.usd)} r="5" />
          </g>
        )}
        <rect
          className="ch-hit"
          x={m.l}
          y={m.t}
          width={W - m.l - m.r}
          height={H - m.t - m.b}
          fill="transparent"
          onPointerMove={move}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover && (
        <div
          className="ch-tip"
          style={{ left: Math.min(Math.max(hover.left, 80), (box.current?.clientWidth || W) - 80), top: (y(hover.p.usd) / H) * H - 12 }}
        >
          <small>{new Date(hover.t).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</small>
          <b>{usd(hover.p.usd)}</b>
          <small>
            {storeNames[hover.p.store] || hover.p.store}
            {hover.k ? ` · keys ${usd(hover.k.usd)}` : ""}
          </small>
        </div>
      )}
    </div>
  );
}

/** 90-day mini chart for lists. */
export function Sparkline({ steps, w = 120, h = 34 }) {
  if (!steps || !steps.length)
    return (
      <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <path className="spark__flat" d={`M0 ${h / 2} H${w}`} />
      </svg>
    );
  const t1 = Date.now();
  const t0 = t1 - 90 * DAY;
  const pts = visible(steps, t0);
  const vals = pts.map((p) => p.usd);
  const lo = Math.min(...vals),
    hi = Math.max(...vals);
  const x = (t) => ((t - t0) / (t1 - t0)) * (w - 4);
  const y = (v) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (h - 6);
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path className="spark__line" d={stepPath(pts, x, y, t1)} />
      <circle className="spark__dot" cx={x(t1)} cy={y(last.usd)} r="2.6" />
    </svg>
  );
}
