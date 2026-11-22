/* ==========================================================================
   PlayRadar — jaquettes génératives (SVG)
   Les jeux du prototype sont fictifs : chaque jaquette est dessinée à partir
   de trois couleurs et d'un motif. Dans l'application réelle, l'image vient
   de l'API IGDB (champ cover.image_id).
   ========================================================================== */
(function () {
  "use strict";

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const W = 300,
    H = 400;

  const motifs = {
    arches({ c1, c2, c3 }) {
      let arches = "";
      for (let i = 0; i < 6; i++) {
        const x = i * 56 - 8;
        arches += `M${x} 400 V318 a26 26 0 0 1 52 0 V400 Z `;
      }
      return `
        <circle cx="205" cy="150" r="74" fill="${c3}" opacity=".92"/>
        <circle cx="205" cy="150" r="110" fill="${c3}" opacity=".12"/>
        <path d="M0 292 H300 V400 H0 Z" fill="${c1}" opacity=".55"/>
        <path d="M-10 300 H310 V292 H-10Z" fill="#0b0f1a" opacity=".55"/>
        <path d="M-10 400 V300 H310 V400 Z ${arches}" fill="#0b0f1a" fill-rule="evenodd" opacity=".82"/>
        <path d="M40 262 l18 -40 l18 40z M232 268 l12 -28 l12 28z" fill="#0b0f1a" opacity=".5"/>`;
    },
    city({ c2, c3 }, r) {
      let b = "";
      let x = -6;
      while (x < W) {
        const w = 22 + r() * 30,
          h = 70 + r() * 150;
        b += `<rect x="${x.toFixed(1)}" y="${(330 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h + 80).toFixed(1)}" fill="#070b18"/>`;
        for (let k = 0; k < 6; k++) {
          if (r() > 0.45) b += `<rect x="${(x + 4 + r() * (w - 10)).toFixed(1)}" y="${(330 - h + 8 + r() * (h - 20)).toFixed(1)}" width="3" height="3" fill="${r() > 0.5 ? c2 : c3}" opacity=".9"/>`;
        }
        x += w + 2;
      }
      return `
        <circle cx="80" cy="96" r="34" fill="${c3}" opacity=".9"/><circle cx="94" cy="88" r="32" fill="url(#bg)"/>
        <path d="M0 250 H300" stroke="${c2}" stroke-width="2" opacity=".55"/>
        <path d="M0 268 H300" stroke="${c2}" stroke-width="1" opacity=".3"/>
        ${b}
        <path d="M120 330 v-60 a30 30 0 0 1 60 0 v60z" fill="#070b18"/><path d="M128 330 v-56 a22 22 0 0 1 44 0 v56" fill="none" stroke="${c2}" stroke-width="2.5"/>`;
    },
    dunes({ c1, c2, c3 }) {
      return `
        <circle cx="96" cy="128" r="58" fill="#fff4d8" opacity=".9"/>
        <path d="M0 250 C70 200 130 230 190 214 S280 190 300 200 V400 H0Z" fill="${c1}" opacity=".7"/>
        <path d="M0 300 C60 262 150 286 210 262 S290 250 300 252 V400 H0Z" fill="${c3}" opacity=".35"/>
        <path d="M0 340 C90 300 170 330 300 296 V400 H0Z" fill="${c3}" opacity=".6"/>
        <g stroke="#fff4d8" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M150 180 h70"/><path d="M170 192 h90"/><path d="M196 204 h60"/></g>`;
    },
    lighthouse({ c2, c3 }, r) {
      let stars = "";
      for (let i = 0; i < 28; i++) stars += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * 200).toFixed(1)}" r="${(r() * 1.4 + 0.3).toFixed(2)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
      return `${stars}
        <path d="M168 132 L300 70 V210 Z" fill="${c2}" opacity=".35"/>
        <path d="M168 132 L300 96 V170 Z" fill="${c3}" opacity=".35"/>
        <path d="M150 300 L158 140 H178 L186 300Z" fill="${c3}"/>
        <path d="M153 240 H183 M155 200 H181" stroke="#16324a" stroke-width="10"/>
        <rect x="156" y="120" width="24" height="22" rx="3" fill="${c2}"/>
        <path d="M152 120 L168 104 L184 120Z" fill="${c3}"/>
        <path d="M0 300 H300 V400 H0Z" fill="#0d2235"/>
        <g fill="none" stroke="${c2}" stroke-width="2" opacity=".55" stroke-linecap="round"><path d="M20 322 q12 -8 24 0 t24 0"/><path d="M190 340 q12 -8 24 0 t24 0 t24 0"/><path d="M80 362 q12 -8 24 0 t24 0"/></g>`;
    },
    waves({ c2, c3 }) {
      let w = "";
      for (let i = 0; i < 9; i++) {
        const y = 170 + i * 26;
        w += `<path d="M-20 ${y} q 40 -18 80 0 t 80 0 t 80 0 t 80 0 t 80 0" fill="none" stroke="${i % 2 ? c3 : c2}" stroke-width="${i % 3 === 0 ? 3 : 1.5}" opacity="${0.25 + i * 0.07}"/>`;
      }
      return `<circle cx="210" cy="104" r="44" fill="${c3}" opacity=".85"/>
        <path d="M60 196 q50 -70 120 0z" fill="#062a38"/>${w}`;
    },
    basalt({ c2, c3 }) {
      let cols = "";
      for (let i = 0; i < 8; i++) {
        const x = i * 40 - 10,
          top = 150 + ((i * 53) % 90);
        cols += `<path d="M${x} 400 V${top} l20 -12 l20 12 V400Z" fill="${i % 2 ? "#2a2d38" : "#22252f"}"/><path d="M${x} ${top} l20 -12 l20 12 l-20 12z" fill="#3a3e4c"/>`;
      }
      return `<circle cx="150" cy="420" r="190" fill="${c2}" opacity=".35"/>
        ${cols}
        <path d="M0 360 C80 340 220 380 300 350 V400 H0Z" fill="${c2}" opacity=".8"/>
        <path d="M0 380 C80 366 220 396 300 372 V400 H0Z" fill="${c3}" opacity=".7"/>`;
    },
    orbit({ c2, c3 }, r) {
      let stars = "";
      for (let i = 0; i < 40; i++) stars += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H).toFixed(1)}" r="${(r() * 1.3 + 0.3).toFixed(2)}" fill="#fff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
      return `${stars}
        <g fill="none" stroke="${c3}" opacity=".5"><ellipse cx="150" cy="180" rx="130" ry="44" transform="rotate(-18 150 180)"/><ellipse cx="150" cy="180" rx="90" ry="28" transform="rotate(-18 150 180)"/></g>
        <circle cx="150" cy="180" r="36" fill="${c2}"/><circle cx="140" cy="170" r="36" fill="#fff" opacity=".12"/>
        <circle cx="262" cy="146" r="9" fill="${c3}"/><circle cx="66" cy="216" r="6" fill="#fff"/>`;
    },
    souk({ c1, c2, c3 }) {
      let stripes = "";
      for (let i = 0; i < 10; i++) stripes += `<rect x="${i * 30}" y="0" width="15" height="150" fill="${c3}" opacity=".18"/>`;
      let lanterns = "";
      [60, 130, 200, 260].forEach((x, i) => {
        const y = 150 + (i % 2) * 30;
        lanterns += `<path d="M${x} 0 V${y - 18}" stroke="${c3}" opacity=".5"/><path d="M${x - 10} ${y - 18} h20 l6 18 l-6 18 h-20 l-6 -18z" fill="${c2}"/><path d="M${x - 10} ${y - 18} h20 l6 18 l-6 18 h-20 l-6 -18z" fill="#fff" opacity=".2"/>`;
      });
      return `${stripes}
        <path d="M0 150 Q75 196 150 150 T300 150 V0 H0Z" fill="${c1}" opacity=".45"/>
        ${lanterns}
        <path d="M0 330 h300 v70 h-300z" fill="#3d160d"/>
        <path d="M30 330 v-60 h60 v60 M120 330 v-74 h70 v74 M220 330 v-56 h56 v56" fill="#5a2214"/>`;
    },
    sails({ c2, c3 }) {
      return `<circle cx="214" cy="110" r="40" fill="${c3}"/>
        <path d="M140 290 V120 L210 270Z" fill="${c3}"/><path d="M134 290 V150 L84 270Z" fill="${c2}"/>
        <path d="M70 296 H230 L210 322 H92Z" fill="#0a2238"/>
        <path d="M0 316 H300 V400 H0Z" fill="#0a2238" opacity=".85"/>
        <g fill="none" stroke="${c3}" stroke-width="2" opacity=".5" stroke-linecap="round"><path d="M30 344 q10 -6 20 0 t20 0"/><path d="M200 360 q10 -6 20 0 t20 0 t20 0"/></g>`;
    },
    tiles({ c2, c3 }) {
      let t = "";
      const star = (cx, cy, s) => {
        let p = "";
        for (let i = 0; i < 16; i++) {
          const a = (Math.PI / 8) * i,
            rr = i % 2 ? s * 0.62 : s;
          p += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
        }
        return p + "Z";
      };
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 4; x++) {
          const cx = x * 84 + (y % 2) * 42,
            cy = y * 72 + 20;
          t += `<path d="${star(cx, cy, 30)}" fill="${(x + y) % 2 ? c2 : c3}" opacity="${(x + y) % 3 ? 0.9 : 0.55}"/><circle cx="${cx}" cy="${cy}" r="7" fill="#0f4c5c"/>`;
        }
      return t + `<rect y="230" width="300" height="170" fill="#0f4c5c" opacity=".55"/>`;
    },
    snow({ c2, c3 }, r) {
      let s = "";
      for (let i = 0; i < 46; i++) s += `<circle cx="${(r() * W).toFixed(1)}" cy="${(r() * H).toFixed(1)}" r="${(r() * 2 + 0.4).toFixed(2)}" fill="#fff" opacity="${(0.3 + r() * 0.6).toFixed(2)}"/>`;
      let flake = "";
      for (let i = 0; i < 6; i++) flake += `<g transform="rotate(${i * 60} 150 160)"><path d="M150 160 V80 M150 104 l-14 -14 M150 104 l14 -14 M150 128 l-10 -10 M150 128 l10 -10" stroke="${c3}" stroke-width="5" stroke-linecap="round" fill="none"/></g>`;
      return `${s}<circle cx="150" cy="160" r="100" fill="${c2}" opacity=".12"/>${flake}
        <path d="M0 300 L70 250 L130 290 L200 236 L300 300 V400 H0Z" fill="#e8f4ff" opacity=".9"/>
        <path d="M0 330 L90 290 L170 330 L240 300 L300 330 V400 H0Z" fill="#cfe6fb"/>`;
    },
    peaks({ c1, c2, c3 }) {
      return `<circle cx="200" cy="120" r="46" fill="${c3}" opacity=".9"/>
        <path d="M0 260 L60 180 L110 230 L170 140 L240 220 L300 170 V400 H0Z" fill="${c2}" opacity=".55"/>
        <path d="M170 140 L190 166 L176 162 L160 176 Z" fill="#fff" opacity=".8"/>
        <path d="M0 300 L80 220 L150 280 L220 210 L300 270 V400 H0Z" fill="${c1}" opacity=".85"/>
        <path d="M0 340 L90 290 L180 330 L260 290 L300 310 V400 H0Z" fill="#0f2419"/>`;
    },
  };

  function lines(title) {
    const w = title.split(" ");
    if (w.length === 1) return [title];
    if (w.length === 2) return w;
    return [w.slice(0, -1).join(" "), w[w.length - 1]];
  }

  /**
   * @param {object} g  jeu
   * @param {object} o  { title: bool } — affiche ou non le titre sur la jaquette
   */
  function cover(g, o = {}) {
    const { c1, c2 } = g.cover;
    const r = rng(hash(g.id));
    const id = "c" + hash(g.id).toString(36);
    const art = motifs[g.cover.motif](g.cover, r).replace(/url\(#bg\)/g, `url(#${id}bg)`);
    const ls = lines(g.title);
    const fs = ls.some((l) => l.length > 9) ? 32 : 38;
    const title =
      o.title === false
        ? ""
        : `<rect x="0" y="${H - 150}" width="${W}" height="150" fill="url(#${id}fade)"/>
      <text x="22" y="${H - 34 - (ls.length - 1) * fs * 0.98}" font-family="Space Grotesk, DM Sans, sans-serif" font-weight="700" font-size="${fs}" letter-spacing="-0.5" fill="#fff">${ls
        .map((l, i) => `<tspan x="22" dy="${i ? fs * 0.98 : 0}">${l}</tspan>`)
        .join("")}</text>
      <text x="23" y="${H - 34 - (ls.length - 1) * fs * 0.98 - fs - 4}" font-family="JetBrains Mono, monospace" font-size="10.5" letter-spacing="1.6" fill="#fff" opacity=".78">${g.studio.toUpperCase()}</text>`;
    return `<svg class="cover__svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Jaquette de ${g.title}">
      <defs>
        <linearGradient id="${id}bg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="400"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
        <linearGradient id="${id}fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070d" stop-opacity="0"/><stop offset="1" stop-color="#05070d" stop-opacity=".78"/></linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#${id}bg)"/>
      ${art}
      ${title}
    </svg>`;
  }

  window.PR = window.PR || {};
  window.PR.cover = cover;
})();
