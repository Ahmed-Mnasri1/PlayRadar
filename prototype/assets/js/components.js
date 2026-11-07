/* ==========================================================================
   PlayRadar — composants d'interface
   Chaque fonction correspond à un futur composant React (voir README) :
   Header, Footer, TabBar, GameCard, Money, Badge, Toast, AlertDialog…
   ========================================================================== */
(function () {
  "use strict";
  const PR = window.PR;
  const { fmt } = PR;

  /* ---------- Utilitaires ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const params = new URLSearchParams(location.search);

  function icon(name, cls = "") {
    return `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.PR_ICONS[name] || ""}</svg>`;
  }

  /** Montant affiché dans la devise choisie ; se met à jour sans recharger. */
  function money(v, kind = "main", cls = "") {
    const text = kind === "alt" ? fmt.alt(v) : fmt.price(v);
    return `<span class="money ${cls}" data-eur="${v}" data-k="${kind}">${text}</span>`;
  }
  function refreshMoney() {
    $$(".money").forEach((el) => {
      const v = parseFloat(el.dataset.eur);
      el.textContent = el.dataset.k === "alt" ? fmt.alt(v) : fmt.price(v);
    });
    $$("[data-cur]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === PR.currency())));
    document.dispatchEvent(new CustomEvent("pr:currency"));
  }

  /* ---------- Logo ---------- */
  function logo() {
    return `<a class="logo" href="index.html" aria-label="PlayRadar, accueil">
      <svg class="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>
        <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>
        <path d="M16 16 L27.5 9.5 A14 14 0 0 1 30 16 Z" fill="var(--radar)" opacity=".35"/>
        <path d="M16 16 L27.5 9.5" stroke="var(--radar)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="16" cy="16" r="2.2" fill="currentColor"/>
        <circle cx="22.5" cy="11" r="2" fill="var(--radar)"/>
      </svg>
      <span class="logo__word">Play<b>Radar</b></span>
    </a>`;
  }

  /* ---------- En-tête ---------- */
  function header(active) {
    const count = PR.list().length;
    const nav = [
      { id: "sorties", label: "Sorties", href: "#", soon: "Calendrier des sorties" },
      { id: "promos", label: "Promos", href: "recherche.html?promo=1" },
      { id: "liste", label: "Ma liste", href: "liste.html", count },
    ];
    return `<div class="header__in wrap" data-wf="En-tête">
      ${logo()}
      <form class="search" role="search" action="recherche.html" autocomplete="off" data-search>
        ${icon("search", "search__icon")}
        <input class="search__input" type="search" name="q" placeholder="Rechercher un jeu, un studio…" aria-label="Rechercher un jeu ou un studio" value="${esc(params.get("q") || "")}" />
        <kbd class="search__kbd" aria-hidden="true">/</kbd>
        <div class="suggest" role="listbox" hidden></div>
      </form>
      <nav class="nav" aria-label="Navigation principale">
        ${nav
          .map(
            (n) => `<a class="nav__link" href="${n.href}" ${n.soon ? `data-soon="${n.soon}"` : ""} ${active === n.id ? 'aria-current="page"' : ""}>${n.label}${n.count ? `<span class="nav__count" data-list-count>${n.count}</span>` : ""}</a>`
          )
          .join("")}
      </nav>
      <div class="cur" role="group" aria-label="Devise d'affichage">
        <button type="button" data-cur="EUR" aria-pressed="${PR.currency() === "EUR"}">€</button>
        <button type="button" data-cur="TND" aria-pressed="${PR.currency() === "TND"}">DT</button>
      </div>
      <button class="avatar" type="button" data-soon="Profil et paramètres" aria-label="Mon profil (Yassine)">Y</button>
    </div>`;
  }

  /* ---------- Barre d'onglets mobile ---------- */
  function tabbar(active) {
    const items = [
      { id: "accueil", label: "Accueil", icon: "house", href: "index.html" },
      { id: "recherche", label: "Recherche", icon: "search", href: "recherche.html" },
      { id: "sorties", label: "Sorties", icon: "calendar", href: "#", soon: "Calendrier des sorties" },
      { id: "liste", label: "Ma liste", icon: "bookmark", href: "liste.html" },
    ];
    return items
      .map(
        (t) => `<a class="tabbar__item" href="${t.href}" ${t.soon ? `data-soon="${t.soon}"` : ""} ${active === t.id ? 'aria-current="page"' : ""}>${icon(t.icon)}<span>${t.label}</span></a>`
      )
      .join("");
  }

  /* ---------- Pied de page ---------- */
  function footer() {
    return `<div class="wrap footer__in" data-wf="Pied de page">
      <div class="footer__brand">
        ${logo()}
        <p>Prix des boutiques officielles, relevés chaque jour. PlayRadar ne vend aucun jeu : nous vous orientons vers la bonne boutique.</p>
      </div>
      <div class="footer__cols">
        <div><h3>Explorer</h3><a href="recherche.html">Tous les jeux</a><a href="recherche.html?promo=1">Promos</a><a href="#" data-soon="Calendrier des sorties">Sorties</a></div>
        <div><h3>Mon compte</h3><a href="liste.html">Ma liste</a><a href="liste.html#alertes">Mes alertes</a><a href="#" data-soon="Connexion">Connexion</a></div>
        <div><h3>PlayRadar</h3><a href="#" data-soon="Guide « Acheter depuis la Tunisie »">Acheter depuis la Tunisie</a><a href="#" data-soon="À propos">À propos</a><a href="#" data-soon="Contact">Contact</a></div>
      </div>
    </div>
    <div class="wrap footer__legal">
      <span>Prototype · Projet Web Sup'Com 2026–2027 · Groupe 9</span>
      <span>Données et visuels réels relevés sur Steam le 7 nov. 2026 (© éditeurs) · autres boutiques et historiques simulés · 1 € ≈ ${String(PR.EUR_TO_TND).replace(".", ",")} DT</span>
    </div>`;
  }

  /* ---------- Badges ---------- */
  const badge = {
    discount: (g) => (g.discount > 0 ? `<span class="badge badge--signal">${fmt.pct(g.discount)}</span>` : ""),
    low: (g) => (g.isLow ? `<span class="badge badge--low">${icon("trending-down")}Plus bas historique</span>` : ""),
    preorder: (g) => (g.upcoming ? `<span class="badge badge--sky">${icon("calendar-clock")}${g.best ? "Précommande" : "Annoncé"}</span>` : ""),
    pegi: (g) => `<span class="pegi pegi--${g.pegi}" title="PEGI ${g.pegi}${g.pegiDesc ? " · " + esc(g.pegiDesc) : ""}">PEGI ${g.pegi}</span>`,
    verdict: (g) =>
      g.upcoming || !g.verdict
        ? ""
        : g.verdict === "buy"
          ? `<span class="verdict verdict--buy">${icon("check")}Bonne affaire</span>`
          : g.verdict === "new"
            ? `<span class="verdict verdict--new">${icon("info")}Jamais soldé</span>`
            : `<span class="verdict verdict--wait">${icon("clock")}Mieux vaut attendre</span>`,
  };

  function storeChip(id) {
    const s = PR.STORES[id];
    return `<span class="store"><span class="store__mono" style="--tint:${s.tint}">${s.short}</span>${s.name}</span>`;
  }

  /* ---------- Carte de jeu ---------- */
  function gameCard(g, o = {}) {
    const href = `jeu.html?id=${g.id}`;
    const date = g.upcoming ? (g.release.length === 4 ? `Sortie en ${g.release}` : `Sortie le ${fmt.date(g.release, { day: "numeric", month: "long" })}`) : g.genres[0] || "";
    return `<article class="gcard ${o.size ? "gcard--" + o.size : ""}">
      <a class="gcard__link" href="${href}" aria-label="${esc(g.title)}${g.best ? ", " + fmt.eur(g.best.price) : ""}">
        <div class="cover gcard__cover">${PR.cover(g)}
          <div class="gcard__badges">${badge.discount(g)}${badge.preorder(g)}</div>
        </div>
        <div class="gcard__body">
          <div class="gcard__meta"><span>${date}</span><span class="gcard__plat">${g.platforms.map((p) => p.replace(" Series", "")).join(" · ")}</span></div>
          <h3 class="gcard__title">${esc(g.title)}</h3>
          <div class="gcard__price">
            ${g.best ? money(g.best.price, "main", "price") : `<span class="price price--tba">Prix à venir</span>`}
            ${g.discount > 0 ? `<s class="was">${money(g.base, "main")}</s>` : ""}
          </div>
          <div class="gcard__foot">${badge.low(g) || (g.best ? `<span class="gcard__store">${PR.STORES[g.best.store].name}</span>` : `<span class="gcard__store">Alerte à l'ouverture des précommandes</span>`)}</div>
        </div>
      </a>
    </article>`;
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, ic = "check") {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.innerHTML = `${icon(ic)}<span>${msg}</span>`;
    fixTypo(el);
    el.classList.remove("is-on");
    void el.offsetWidth;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 3400);
  }

  /* ---------- Liste de souhaits ---------- */
  function upsertList(id, patch) {
    const list = PR.list();
    const i = list.findIndex((x) => x.id === id);
    if (i === -1) list.unshift({ id, target: null, alert: false, added: "2026-11-07", ...patch });
    else Object.assign(list[i], patch);
    PR.saveList(list);
    $$("[data-list-count]").forEach((n) => (n.textContent = list.length));
    return list;
  }
  function removeFromList(id) {
    const list = PR.list().filter((x) => x.id !== id);
    PR.saveList(list);
    $$("[data-list-count]").forEach((n) => (n.textContent = list.length));
    return list;
  }
  const inList = (id) => PR.list().some((x) => x.id === id);

  /* ---------- Boîte de dialogue « Créer une alerte » ---------- */
  function alertDialog(g, onDone) {
    let dlg = $("#alert-dialog");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "alert-dialog";
      dlg.className = "dialog";
      document.body.appendChild(dlg);
    }
    const entry = PR.list().find((x) => x.id === g.id);
    const ref = g.best ? g.best.price : 60;
    const suggested = entry?.target || (g.low && !g.neverSold ? Math.floor(g.low.price) : Math.floor(ref * 0.8));
    const chips = g.low && !g.neverSold
      ? [
          { label: "Plus bas historique", v: g.low.price },
          { label: "−30 %", v: +(g.base * 0.7).toFixed(2) },
          { label: "−50 %", v: +(g.base * 0.5).toFixed(2) },
        ]
      : g.base
        ? [
            { label: "−20 %", v: +(g.base * 0.8).toFixed(2) },
            { label: "−40 %", v: +(g.base * 0.6).toFixed(2) },
          ]
        : [];
    dlg.innerHTML = `<form method="dialog" class="dialog__form">
      <header class="dialog__head">
        <div class="cover cover--xs">${PR.cover(g, { title: false })}</div>
        <div><p class="eyebrow">Alerte de prix</p><h2>${esc(g.title)}</h2>
        <p class="muted">${g.best ? `Meilleur prix actuel : ${money(g.best.price)} chez ${PR.STORES[g.best.store].name}` : "Prix pas encore annoncé"}</p></div>
        <button class="icon-btn dialog__x" value="cancel" aria-label="Fermer">${icon("x")}</button>
      </header>
      <label class="field">
        <span class="field__label">Prévenez-moi quand le prix passe sous</span>
        <span class="field__box">
          <input class="field__input mono" type="number" name="target" min="1" step="0.01" value="${suggested}" required inputmode="decimal" />
          <span class="field__unit">€</span>
        </span>
        <span class="field__hint" data-hint></span>
      </label>
      <div class="chips">${chips.map((c) => `<button type="button" class="chip" data-v="${c.v}">${c.label} · ${fmt.eur(c.v)}</button>`).join("")}</div>
      <label class="check"><input type="checkbox" name="mail" checked /> <span>Recevoir un e-mail (y•••@mail.example)</span></label>
      <footer class="dialog__foot">
        <button class="btn btn--ghost" value="cancel">Annuler</button>
        <button class="btn btn--primary" value="ok">${icon("bell-plus")}Créer l'alerte</button>
      </footer>
    </form>`;
    const input = $("input[name=target]", dlg);
    const hint = $("[data-hint]", dlg);
    const upd = () => {
      const v = parseFloat(input.value) || 0;
      const under = g.best && v >= g.best.price;
      hint.innerHTML = `≈ ${fmt.tnd(v)} · ${!g.best ? "l'alerte partira dès l'annonce du prix" : under ? "le prix actuel est déjà sous cette cible : l'alerte partira tout de suite" : `encore ${fmt.eur(g.best.price - v)} de baisse à attendre`}`;
    };
    input.addEventListener("input", upd);
    $$(".chip", dlg).forEach((c) =>
      c.addEventListener("click", () => {
        input.value = c.dataset.v;
        upd();
      })
    );
    upd();
    dlg.onclose = () => {
      if (dlg.returnValue !== "ok") return;
      const v = parseFloat(input.value);
      upsertList(g.id, { target: v, alert: true });
      toast(`Alerte créée : e-mail dès que <b>${esc(g.title)}</b> passe sous ${fmt.eur(v)}`, "bell-ring");
      onDone && onDone(v);
    };
    dlg.showModal();
    input.select();
  }

  /* ---------- Recherche instantanée ---------- */
  function initSearch(form) {
    const input = $(".search__input", form);
    const box = $(".suggest", form);
    let idx = -1;
    const hl = (text, q) => {
      if (!q) return esc(text);
      const i = PR.norm(text).indexOf(PR.norm(q));
      return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
    };
    function render() {
      const q = input.value.trim();
      const nq = PR.norm(q);
      let games, studios = [];
      if (!q) {
        games = PR.GAMES.filter((g) => g.discount >= 30 && !g.upcoming).slice(0, 4);
      } else {
        games = PR.GAMES.filter((g) => PR.norm([g.title, g.aliases, g.genres.join(" ")].join(" ")).includes(nq)).slice(0, 5);
        studios = [...new Set(PR.GAMES.map((g) => g.studio))].filter((s) => PR.norm(s).includes(nq)).slice(0, 2);
      }
      idx = -1;
      box.innerHTML = `
        <p class="suggest__label">${q ? "Jeux" : "Bons plans du moment"}</p>
        ${games.length ? games
          .map(
            (g) => `<a class="suggest__item" role="option" href="jeu.html?id=${g.id}">
            <span class="cover cover--xxs">${PR.cover(g, { title: false })}</span>
            <span class="suggest__txt"><b>${hl(g.title, q)}</b><small>${esc(g.studio)} · ${g.platforms.join(", ")}</small></span>
            <span class="suggest__price">${g.best ? money(g.best.price, "main", "price") : "<small>Prix à venir</small>"}${g.discount > 0 ? `<small class="t-signal">${fmt.pct(g.discount)}</small>` : ""}</span>
          </a>`
          )
          .join("") : `<p class="suggest__empty">Aucun jeu ne correspond à « ${esc(q)} ».</p>`}
        ${studios.length ? `<p class="suggest__label">Studios</p>${studios.map((s) => `<a class="suggest__item suggest__item--studio" role="option" href="recherche.html?q=${encodeURIComponent(s)}">${icon("users")}<span class="suggest__txt"><b>${hl(s, q)}</b><small>${PR.GAMES.filter((g) => g.studio === s).length} jeu(x)</small></span></a>`).join("")}` : ""}
        ${q ? `<a class="suggest__all" role="option" href="recherche.html?q=${encodeURIComponent(q)}">Voir tous les résultats pour « ${esc(q)} » ${icon("arrow-right")}</a>` : ""}`;
      box.hidden = false;
      form.classList.add("is-open");
    }
    const close = () => {
      box.hidden = true;
      form.classList.remove("is-open");
    };
    input.addEventListener("focus", render);
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      const items = $$(".suggest__item, .suggest__all", box);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle("is-active", i === idx));
        items[idx]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && idx >= 0) {
        e.preventDefault();
        location.href = items[idx].href;
      } else if (e.key === "Escape") {
        close();
        input.blur();
      }
    });
    document.addEventListener("click", (e) => !form.contains(e.target) && close());
  }

  /* ---------- Bascule haute / basse fidélité ---------- */
  function setFidelity(fi) {
    document.documentElement.dataset.fi = fi;
    PR.store.set("fi", fi);
    $$("[data-fi-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.fiSet === fi)));
    document.dispatchEvent(new CustomEvent("pr:fidelity"));
  }
  function fidelityToggle() {
    const el = document.createElement("div");
    el.className = "fi-toggle";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Niveau de fidélité du prototype");
    el.innerHTML = `<span class="fi-toggle__label">Prototype</span>
      <button type="button" data-fi-set="hi">Haute fidélité</button>
      <button type="button" data-fi-set="lo">Wireframe <kbd>W</kbd></button>`;
    document.body.appendChild(el);
    $$("[data-fi-set]", el).forEach((b) => b.addEventListener("click", () => setFidelity(b.dataset.fiSet)));
  }

  /** Remplace les <span data-icon="nom"> écrits dans le HTML par l'icône SVG. */
  function hydrateIcons(root = document) {
    $$("[data-icon]", root).forEach((el) => (el.outerHTML = icon(el.dataset.icon, el.dataset.cls || "")));
  }

  /** Typographie française : espace fine insécable avant : ; ? ! » et après «. */
  function fixTypo(root = document.body) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest("script,style,svg,textarea") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue.replace(/[  ]([:;?!»])/g, " $1").replace(/«[  ]/g, "« ");
      if (t !== n.nodeValue) n.nodeValue = t;
    }
  }

  /* ---------- Montage commun à toutes les pages ---------- */
  function mount() {
    const page = document.body.dataset.page;
    const root = document.documentElement;
    root.dataset.fi = params.get("fi") || PR.store.get("fi", "hi");
    if (params.has("shot")) root.classList.add("is-shot");

    const h = $("[data-slot=header]");
    if (h) h.innerHTML = header(page);
    const f = $("[data-slot=footer]");
    if (f) f.innerHTML = footer();
    const t = $("[data-slot=tabbar]");
    if (t) t.innerHTML = tabbar(page);

    fidelityToggle();
    setFidelity(root.dataset.fi);
    hydrateIcons();

    const form = $("[data-search]");
    if (form) initSearch(form);

    document.addEventListener("click", (e) => {
      const soon = e.target.closest("[data-soon]");
      if (soon) {
        e.preventDefault();
        toast(`« ${soon.dataset.soon} » figure dans l'arborescence, hors du périmètre de ce prototype.`, "info");
      }
      const cur = e.target.closest("[data-cur]");
      if (cur) {
        PR.store.set("cur", cur.dataset.cur);
        refreshMoney();
      }
    });
    document.addEventListener("keydown", (e) => {
      const typing = /input|textarea|select/i.test(e.target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        $(".search__input")?.focus();
      }
      if ((e.key === "w" || e.key === "W") && !typing && !e.metaKey && !e.ctrlKey) setFidelity(root.dataset.fi === "lo" ? "hi" : "lo");
    });

    if (typeof PR.page === "function") PR.page();
    hydrateIcons();
    fixTypo();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-ready")));
  }

  Object.assign(PR, { $, $$, esc, params, icon, hydrateIcons, fixTypo, money, refreshMoney, badge, storeChip, gameCard, toast, alertDialog, upsertList, removeFromList, inList, setFidelity });
  document.addEventListener("DOMContentLoaded", mount);
})();
