/* ==========================================================================
   PlayRadar — graphique d'historique des prix (SVG, sans dépendance)
   Dans l'application Next.js, ce composant sera remplacé par Recharts
   (<LineChart type="stepAfter">) avec les mêmes données.
   ========================================================================== */
(function () {
  "use strict";
  const PR = window.PR;
  const DAY = 86400000;
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  /** Paliers visibles entre `start` et aujourd'hui. */
  function slice(history, start) {
    const end = PR.TODAY;
    const pts = history.filter((p) => p.from < end);
    let i = pts.findIndex((p) => p.from > start) - 1;
    if (i < -1) i = pts.length - 1;
    const out = pts.slice(Math.max(0, i)).map((p) => ({ ...p }));
    if (out[0] && out[0].from < start) out[0].from = start;
    return out;
  }

  function niceTicks(min, max, n = 4) {
    const step0 = (max - min) / n;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(+v.toFixed(2));
    return ticks;
  }

  /**
   * Graphique complet avec axes et info-bulle.
   * @param {HTMLElement} el conteneur
   * @param {object} g jeu
   * @param {number} months fenêtre (3, 6, 12)
   */
  function priceChart(el, g, months = 12) {
    const W = Math.max(320, el.clientWidth || 640);
    const H = el.clientHeight > 120 ? el.clientHeight : 260;
    const m = { t: 18, r: 16, b: 30, l: 52 };
    const start = new Date(Math.max(g.history[0].from.getTime(), PR.TODAY.getTime() - months * 30.44 * DAY));
    const pts = slice(g.history, start);
    const t0 = start.getTime(),
      t1 = PR.TODAY.getTime();
    const lo = Math.min(g.low.price, ...pts.map((p) => p.price));
    const yMin = Math.max(0, lo - (g.base - lo) * 0.35);
    const yMax = g.base + (g.base - lo) * 0.18;
    const x = (t) => m.l + ((t - t0) / (t1 - t0)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (H - m.t - m.b);

    let d = "";
    pts.forEach((p, i) => {
      const nx = i < pts.length - 1 ? pts[i + 1].from.getTime() : t1;
      d += `${i ? "L" : "M"}${x(p.from.getTime()).toFixed(1)} ${y(p.price).toFixed(1)} H${x(nx).toFixed(1)} `;
    });
    const area = d + `V${y(yMin)} H${x(t0)} Z`;

    const yt = niceTicks(yMin, yMax, 4);
    const grid = yt
      .map((v) => `<line class="ch-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="ch-ylab" x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)} €</text>`)
      .join("");

    let xt = "";
    const cur = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const step = months > 6 ? 2 : 1;
    let k = 0;
    while (cur.getTime() < t1) {
      if (k++ % step === 0) xt += `<text class="ch-xlab" x="${x(cur.getTime())}" y="${H - 8}" text-anchor="middle">${MONTHS[cur.getMonth()]}</text><line class="ch-tick" x1="${x(cur.getTime())}" x2="${x(cur.getTime())}" y1="${H - m.b}" y2="${H - m.b + 4}"/>`;
      cur.setMonth(cur.getMonth() + 1);
    }

    const ly = y(g.low.price);
    const last = pts[pts.length - 1];
    const uid = "g" + Math.random().toString(36).slice(2, 7);
    el.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Historique du meilleur prix de ${PR.esc(g.title)} sur ${months} mois">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ch-stop-a"/><stop offset="1" class="ch-stop-b"/></linearGradient></defs>
      ${grid}${xt}
      <line class="ch-axis" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/>
      <path class="ch-area" d="${area}" fill="url(#${uid})"/>
      <line class="ch-low" x1="${m.l}" x2="${W - m.r}" y1="${ly}" y2="${ly}"/>
      <path class="ch-line" d="${d}" pathLength="1"/>
      <circle class="ch-now-ring" cx="${x(t1)}" cy="${y(last.price)}" r="9"/>
      <circle class="ch-now" cx="${x(t1)}" cy="${y(last.price)}" r="4.5"/>
      <g class="ch-hover" hidden><line class="ch-cross" y1="${m.t}" y2="${H - m.b}"/><circle class="ch-dot" r="5"/></g>
      <rect class="ch-hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>
    </svg><div class="ch-tip" hidden></div>`;

    const svg = el.querySelector("svg");
    const hov = svg.querySelector(".ch-hover");
    const tip = el.querySelector(".ch-tip");
    const hit = svg.querySelector(".ch-hit");
    function move(e) {
      const r = svg.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const t = t0 + ((px - m.l) / (W - m.l - m.r)) * (t1 - t0);
      let p = pts[0];
      for (const q of pts) if (q.from.getTime() <= t) p = q;
      const cx = Math.min(Math.max(px, m.l), W - m.r);
      hov.hidden = false;
      hov.querySelector(".ch-cross").setAttribute("x1", cx);
      hov.querySelector(".ch-cross").setAttribute("x2", cx);
      hov.querySelector(".ch-dot").setAttribute("cx", cx);
      hov.querySelector(".ch-dot").setAttribute("cy", y(p.price));
      tip.hidden = false;
      tip.innerHTML = `<small>${new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</small><b>${PR.fmt.price(p.price)}</b><small>${PR.STORES[p.store].name}${p.price < g.base ? ` · −${Math.round((1 - p.price / g.base) * 100)} %` : ""}</small>`;
      const left = (cx / W) * r.width;
      tip.style.left = Math.min(Math.max(left, 70), r.width - 70) + "px";
      tip.style.top = (y(p.price) / H) * r.height - 12 + "px";
    }
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerleave", () => {
      hov.hidden = true;
      tip.hidden = true;
    });
    return { lowY: ly, W, H };
  }

  /** Mini-courbe (90 jours) pour les listes. */
  function sparkline(g, w = 120, h = 34) {
    if (!g.history) return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path class="spark__flat" d="M0 ${h / 2} H${w}"/></svg>`;
    const start = new Date(PR.TODAY.getTime() - 90 * DAY);
    const pts = slice(g.history, start);
    const t0 = start.getTime(),
      t1 = PR.TODAY.getTime();
    const lo = Math.min(g.low.price, ...pts.map((p) => p.price)),
      hi = g.base;
    const x = (t) => ((t - t0) / (t1 - t0)) * (w - 4);
    const y = (v) => 3 + (1 - (v - lo) / (hi - lo || 1)) * (h - 6);
    let d = "";
    pts.forEach((p, i) => {
      const nx = i < pts.length - 1 ? pts[i + 1].from.getTime() : t1;
      d += `${i ? "L" : "M"}${x(p.from.getTime()).toFixed(1)} ${y(p.price).toFixed(1)} H${x(nx).toFixed(1)} `;
    });
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path class="spark__line" d="${d}"/><circle class="spark__dot" cx="${x(t1)}" cy="${y(last.price)}" r="2.6"/></svg>`;
  }

  PR.priceChart = priceChart;
  PR.sparkline = sparkline;
})();
