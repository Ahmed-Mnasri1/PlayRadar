/* ==========================================================================
   PlayRadar — moteur de présentation
   · Navigation : flèches, Espace, PageUp/PageDown, Début/Fin, F (plein écran)
   · Un mouvement marquant par diapositive (3D, tracés, parcours, mur, bandes,
     flux de données) ; le reste apparaît simplement.
   · ?print : diapositives à plat dans leur état final (export PDF)
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const PRINT = params.has("print");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  if (PRINT) root.classList.add("is-print");

  const slides = $$(".slide");
  const N = slides.length;

  /* ---------- Préparation du DOM ---------- */
  $$("[data-icon]").forEach((el) => {
    el.outerHTML = `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.PR_ICONS[el.dataset.icon] || ""}</svg>`;
  });
  slides.forEach((s, i) => {
    const pg = $(".pg", s);
    if (pg) pg.textContent = `${i + 1} / ${N}`;
  });
  // Libellés des arrêts (diapositive 04)
  $$(".stop").forEach((st) => {
    const txt = [...st.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim());
    txt.forEach((n) => {
      const sp = document.createElement("span");
      sp.className = "stop-label";
      sp.textContent = n.nodeValue.trim();
      n.replaceWith(sp);
    });
  });
  // Typographie française : espace fine insécable avant : ; ? ! » et après «
  (function fixTypo() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest("script,style,code,.cmap") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue.replace(/[  ]([:;?!»])/g, " $1").replace(/«[  ]/g, "« ");
      if (t !== n.nodeValue) n.nodeValue = t;
    }
  })();
  const fmtNum = (v, dec) => v.toFixed(dec).replace(".", ",");

  /* ---------- Scènes 3D ---------- */
  const gl = new Map();
  $$("canvas[data-gl]").forEach((c) => {
    if (!window.THREE || !window.PRGL) return;
    try {
      gl.set(c.closest(".slide"), window.PRGL.create(c, c.dataset.gl, { preserve: PRINT }));
    } catch (e) {
      console.warn("WebGL indisponible", e);
    }
  });

  /* ---------- Flux de données (canvas 2D, diapositive 10) ---------- */
  function makePipe(cv) {
    const Wc = 1664,
      Hc = cv.offsetHeight || 240,
      Y = +(cv.dataset.y || 120),
      dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Wc * dpr;
    cv.height = Hc * dpr;
    const g = cv.getContext("2d");
    g.scale(dpr, dpr);
    const xs = [0, 0.25, 0.5, 0.75, 1].map((f, i) => (i === 0 ? 14 : i === 4 ? Wc - 20 : f * Wc));
    const bx = xs[1];
    const parts = Array.from({ length: 20 }, (_, i) => ({ p: i / 20, v: 0.045 + ((i * 37) % 11) / 400, branch: i % 6 === 2 }));
    let t = 0,
      raf = 0,
      run = false,
      last = 0;
    function frame(dt) {
      t += dt;
      g.clearRect(0, 0, Wc, Hc);
      // voies
      g.lineCap = "round";
      g.strokeStyle = "rgba(22,27,38,0.85)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(xs[0], Y);
      g.lineTo(xs[4], Y);
      g.stroke();
      g.setLineDash([5, 7]);
      g.lineWidth = 2;
      g.strokeStyle = "rgba(22,27,38,0.45)";
      g.beginPath();
      g.moveTo(bx, Y);
      g.lineTo(bx, Y + 62);
      g.lineTo(bx + 36, Y + 62);
      g.stroke();
      g.setLineDash([]);
      // particules : chaque point est une donnée qui traverse la chaîne
      for (const q of parts) {
        q.p = (q.p + q.v * dt) % 1;
        let x, y, a;
        if (q.branch && q.p > (bx - xs[0]) / (xs[4] - xs[0])) {
          const k = (q.p - (bx - xs[0]) / (xs[4] - xs[0])) * 4;
          if (k > 1) continue;
          x = bx + (k > 0.6 ? (k - 0.6) * 90 : 0);
          y = Y + Math.min(1, k / 0.6) * 62;
          a = 1 - k * 0.6;
        } else {
          x = xs[0] + q.p * (xs[4] - xs[0]);
          y = Y;
          a = Math.min(1, q.p * 8, (1 - q.p) * 8);
        }
        g.globalAlpha = a;
        g.fillStyle = "#c8f169";
        g.strokeStyle = "#161b26";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.globalAlpha = 1;
      // stations
      xs.forEach((x, i) => {
        g.fillStyle = i === 4 ? "#161b26" : "#f3f1ec";
        g.strokeStyle = "#161b26";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(x, Y, i === 4 ? 12 : 10, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        if (i === 4) {
          g.strokeStyle = "#c8f169";
          g.lineWidth = 3;
          g.beginPath();
          g.arc(x, Y, 17, 0, Math.PI * 2);
          g.stroke();
        }
      });
    }
    function loop(now) {
      if (!run) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      frame(dt);
      raf = requestAnimationFrame(loop);
    }
    frame(0);
    return {
      start() {
        if (run) return;
        run = true;
        last = 0;
        raf = requestAnimationFrame(loop);
      },
      stop() {
        run = false;
        cancelAnimationFrame(raf);
      },
      still() {
        parts.forEach((q, i) => (q.p = ((i * 0.618) % 1)));
        frame(0);
      },
    };
  }
  const pipes = new Map();
  $$("canvas[data-pipe]").forEach((c) => pipes.set(c.closest(".slide"), makePipe(c)));

  /* ---------- Visite guidée de la fiche (diapositive 06) ---------- */
  const tour = (function () {
    const slide = $('[data-fx="tour"]');
    if (!slide || !window.SHOTS) return null;
    const meta = window.SHOTS["hi-jeu-full"];
    const page = $("[data-page]", slide);
    const view = $(".tour__view", slide);
    const hl = $("[data-hl]", slide);
    const calls = $$("[data-calls] li", slide);
    const k = 1088 / meta.w;
    const order = ["decide", "prix", "historique", "editions", "pay"];
    function target(i) {
      const r = meta.rects[order[i]];
      const vh = view.clientHeight || 852;
      const maxScroll = meta.h * k - vh;
      const want = i === 0 ? 0 : r.y * k - 70;
      return { scroll: Math.max(0, Math.min(maxScroll, want)), x: r.x * k - 10, y: r.y * k - 10, w: r.w * k + 20, h: r.h * k + 20 };
    }
    function set(i, animate) {
      const t = target(i);
      calls.forEach((c, j) => c.classList.toggle("is-on", j === i));
      const d = animate && !REDUCED ? 0.9 : 0;
      gsap.to(page, { y: -t.scroll, duration: d, ease: "power2.inOut", overwrite: true });
      gsap.to(hl, { x: t.x, y: t.y, width: t.w, height: t.h, opacity: 1, duration: d, ease: "power2.inOut", overwrite: true });
    }
    return { slide, set, hl, page, steps: order.length };
  })();

  /* ---------- Timelines d'entrée ---------- */
  function splitLetters(el) {
    if (el.dataset.split) return $$(".ch", el);
    el.dataset.split = "1";
    $$(".w", el).forEach((w) => (w.innerHTML = [...w.textContent].map((c) => `<span class="ch">${c === " " ? "&nbsp;" : c}</span>`).join("")));
    return $$(".ch", el);
  }
  function drawPaths(tl, paths, at, dur = 0.8, step = 0.05) {
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      const dashed = getComputedStyle(p).strokeDasharray;
      if (dashed && dashed !== "none") {
        tl.from(p, { opacity: 0, duration: 0.5, ease: "power2.out" }, at + i * step);
      } else {
        p.style.strokeDasharray = len;
        tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut" }, at + i * step);
      }
    });
  }

  function build(slide) {
    const tl = gsap.timeline({ paused: true });
    let t = 0.05;
    $$("[data-a]", slide).forEach((el) => {
      const at = el.dataset.at != null ? parseFloat(el.dataset.at) : t;
      switch (el.dataset.a) {
        case "letters": {
          const ch = splitLetters(el);
          tl.from(ch, { yPercent: 40, opacity: 0, filter: "blur(14px)", duration: 1, ease: "expo.out", stagger: 0.06, clearProps: "filter" }, at);
          t = at + 0.4;
          break;
        }
        case "up":
          tl.from(el, { opacity: 0, y: 16, duration: 0.7, ease: "expo.out" }, at);
          t = at + 0.08;
          break;
        case "fade":
          tl.from(el, { opacity: 0, duration: 0.6, ease: "power2.out" }, at);
          t = at + 0.06;
          break;
        case "pop":
          tl.from(el, { opacity: 0, scale: 0.97, duration: 1, ease: "expo.out" }, at);
          t = at + 0.1;
          break;
        case "stagger":
          tl.from([...el.children], { opacity: 0, y: 18, duration: 0.8, ease: "expo.out", stagger: 0.07 }, at);
          t = at + 0.15;
          break;
        case "lines":
          tl.from([...el.children], { opacity: 0, x: -16, duration: 0.7, ease: "expo.out", stagger: 0.09 }, at);
          t = at + 0.2;
          break;
        case "wipe":
          tl.fromTo(el, { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)", duration: 1.3, ease: "power3.inOut" }, at);
          break;
      }
    });

    const fx = slide.dataset.fx || ($(".metro", slide) && "metro");
    if (fx === "metro" || $(".metro", slide)) {
      const svg = $(".metro", slide);
      drawPaths(tl, $$(".m-lines path", svg), 0.35, 0.9, 0.06);
      tl.from($$(".m-stops > *", svg), { opacity: 0, duration: 0.45, ease: "power2.out", stagger: 0.025 }, 0.75);
      tl.from($(".m-legend", svg), { opacity: 0, duration: 0.5 }, 1.6);
    }
    if (fx === "clicks") {
      $$(".prow", slide).forEach((row, r) => {
        const line = $(".pline", row);
        const dot = $(".pline__dot", row);
        const fill = $(".pline__fill", row);
        const stops = $$(".stop", line);
        const counter = $("[data-count]", row);
        const n = { v: 0 };
        const x0 = stops[0].offsetLeft + 8;
        const xN = stops[stops.length - 1].offsetLeft + 8;
        let tt = 0.7 + r * 0.45;
        tl.set(counter, { textContent: "0" }, 0);
        tl.fromTo(dot, { x: x0, opacity: 0 }, { opacity: 1, duration: 0.2 }, tt);
        tl.from($$(".stop > i", line).slice(1), { backgroundColor: "#f3f1ec", duration: 0.01 }, 0);
        tl.fromTo(fill, { scaleX: 0 }, { scaleX: 0, duration: 0.01 }, 0);
        stops.slice(1).forEach((s) => {
          const x = s.offsetLeft + 8;
          tl.to(dot, { x, duration: 0.5, ease: "power2.inOut" }, tt);
          tl.to(fill, { scaleX: (x - x0) / (xN - x0), duration: 0.5, ease: "power2.inOut" }, tt);
          tl.to($("i", s), { backgroundColor: "#161b26", duration: 0.15 }, tt + 0.45);
          if (s.dataset.n) tl.to(n, { v: +s.dataset.n, duration: 0.01, onUpdate: () => (counter.textContent = Math.round(n.v)) }, tt + 0.46);
          tt += 0.58;
        });
        tl.to(dot, { opacity: 0, duration: 0.3 }, tt);
        tl.from($(".prow__end img", row), { opacity: 0, x: 14, duration: 0.6, ease: "expo.out" }, tt - 0.2);
      });
    }
    if (fx === "wall") {
      tl.from($$(".wall__s", slide), { rotationY: 0, z: -320, opacity: 0, duration: 1.4, ease: "expo.out", stagger: 0.1 }, 0.25);
      tl.from($$(".phone", slide), { y: 40, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.08 }, 0.7);
    }
    if (fx === "bands") {
      tl.from($$(".band", slide), { scaleY: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, 0);
      tl.from($$(".band > *", slide), { opacity: 0, duration: 0.5, stagger: 0.02 }, 0.7);
      $$("[data-count]", slide).forEach((el) => {
        const to = parseFloat(el.dataset.count);
        const o = { v: 0 };
        tl.to(o, { v: to, duration: 1.2, ease: "power2.out", onUpdate: () => (el.textContent = fmtNum(o.v, 1)) }, 0.7);
      });
    }
    if (fx === "spec") {
      tl.from($(".spec__decide", slide), { opacity: 0, x: 30, duration: 1, ease: "expo.out" }, 0.2);
      drawPaths(tl, $$(".spec__lines path", slide), 0.8, 0.7, 0.12);
      tl.from($$(".spec__lines circle", slide), { scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.out(2)", stagger: 0.12 }, 1.3);
      tl.from($$(".spec__notes > div", slide), { opacity: 0, x: -12, duration: 0.6, ease: "expo.out", stagger: 0.12 }, 0.9);
    }
    if (fx === "pipe") {
      tl.from($$(".pipe__st, .pipe__mail", slide), { opacity: 0, y: 10, duration: 0.6, ease: "expo.out", stagger: 0.09 }, 0.3);
      tl.from($(".pipe__cv", slide), { opacity: 0, duration: 0.6 }, 0.2);
    }
    if (fx === "map") {
      drawPaths(tl, $$(".cmap__lines path", slide), 0.5, 0.6, 0.08);
      tl.from($$(".cmap__l li", slide), { opacity: 0, x: -10, duration: 0.5, stagger: 0.08 }, 0.3);
      tl.from($$(".cmap__r li", slide), { opacity: 0, x: 10, duration: 0.5, stagger: 0.08 }, 0.95);
    }
    if (tour && slide === tour.slide) {
      const lo = $("[data-lo]", slide),
        scan = $("[data-scan]", slide);
      tl.set(tour.hl, { opacity: 0 }, 0);
      tl.set(tour.page, { y: 0 }, 0);
      tl.fromTo(lo, { clipPath: "inset(0 0 0 0%)" }, { clipPath: "inset(0 0 0 100%)", duration: 1.3, ease: "power2.inOut" }, 0.8);
      tl.fromTo(scan, { left: "0%", opacity: 1 }, { left: "100%", duration: 1.3, ease: "power2.inOut" }, 0.8);
      tl.to(scan, { opacity: 0, duration: 0.2 }, 2.1);
      tl.call(() => tour.set(0, true), null, 2.15);
    }
    return tl;
  }

  /* ---------- Export PDF : état final, sans animation ---------- */
  if (PRINT) {
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([fonts, ...[...gl.values()].map((s) => s.ready)]).then(() => {
      gl.forEach((s, slide) => {
        const cv = $("canvas[data-gl]", slide);
        const img = new Image();
        img.className = "gl";
        img.src = s.still(cv.dataset.gl === "ring" ? 2.35 : 1.6);
        cv.replaceWith(img);
      });
      pipes.forEach((p) => p.still());
      if (tour) {
        tour.set(0, false);
        $$("[data-calls] li", tour.slide).forEach((c) => c.classList.add("is-on"));
      }
      requestAnimationFrame(() => root.classList.add("is-ready"));
    });
    return;
  }

  /* ---------- Mise à l'échelle ---------- */
  const deckEl = $("[data-deck]");
  const fit = () => root.style.setProperty("--k", Math.min(innerWidth / 1920, innerHeight / 1080));
  addEventListener("resize", fit);
  fit();

  /* ---------- Navigation ---------- */
  let cur = -1,
    step = 0;
  const tls = new Map();
  const tlOf = (i) => {
    if (!tls.has(i)) tls.set(i, build(slides[i]));
    return tls.get(i);
  };
  function live(slide, on) {
    const s = gl.get(slide);
    if (s) on ? s.start() : s.stop();
    const p = pipes.get(slide);
    if (p) on ? p.start() : p.stop();
  }

  function go(i, dir = 1) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur) return;
    const prev = slides[cur];
    const next = slides[i];
    if (prev) {
      tlOf(cur).pause();
      live(prev, false);
      gsap.to(prev, {
        opacity: 0,
        duration: REDUCED ? 0 : 0.25,
        ease: "power2.in",
        onComplete: () => {
          prev.classList.remove("is-active");
          gsap.set(prev, { clearProps: "opacity" });
        },
      });
    }
    cur = i;
    step = 0;
    next.classList.add("is-active");
    gsap.fromTo(next, { opacity: 0 }, { opacity: 1, duration: REDUCED ? 0 : 0.4, delay: prev ? 0.1 : 0, ease: "power2.out" });
    live(next, true);
    const tl = tlOf(i);
    const scene = gl.get(next);
    if (dir > 0 && !REDUCED) {
      tl.delay(prev ? 0.15 : 0.1).restart(true);
      if (scene) scene.intro(gsap);
    } else {
      tl.progress(1).pause();
      if (tour && next === tour.slide) {
        step = dir < 0 ? tour.steps - 1 : 0;
        tour.set(step, false);
      }
    }
    $("[data-progress]").style.width = ((i + 1) / N) * 100 + "%";
    $("[data-count-label]").textContent = `${i + 1} / ${N}`;
    history.replaceState(null, "", "#" + (i + 1));
    document.title = `${i + 1}. ${next.dataset.title} — PlayRadar, objectif 02`;
  }

  function next() {
    if (tour && slides[cur] === tour.slide && step < tour.steps - 1) {
      const tl = tlOf(cur);
      if (tl.isActive()) tl.progress(1);
      step++;
      return tour.set(step, true);
    }
    go(cur + 1, 1);
  }
  function prev() {
    if (tour && slides[cur] === tour.slide && step > 0) {
      step--;
      return tour.set(step, true);
    }
    go(cur - 1, -1);
  }

  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) (e.preventDefault(), next());
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) (e.preventDefault(), prev());
    else if (k === "Home") go(0, -1);
    else if (k === "End") go(N - 1, -1);
    else if (k === "f" || k === "F") toggleFs();
  });
  $("[data-next]").addEventListener("click", next);
  $("[data-prev]").addEventListener("click", prev);
  $("[data-fs]").addEventListener("click", toggleFs);
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  let sx = null;
  addEventListener("touchstart", (e) => (sx = e.touches[0].clientX), { passive: true });
  addEventListener("touchend", (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    sx = null;
  });
  let idle;
  addEventListener("mousemove", () => {
    deckEl.classList.add("show-ui");
    clearTimeout(idle);
    idle = setTimeout(() => deckEl.classList.remove("show-ui"), 1800);
  });
  setTimeout(() => $("[data-hint]").classList.add("is-gone"), 4200);

  const start = () => go((parseInt(location.hash.slice(1), 10) || parseInt(params.get("s"), 10) || 1) - 1, 1);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
