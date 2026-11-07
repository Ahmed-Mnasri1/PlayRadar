/* ==========================================================================
   PlayRadar — données du prototype
   · Réel (API Steam, relevé le 7 nov. 2026, voir steam-data.js) : titres,
     studios, éditeurs, dates, genres, PEGI, descriptions, configuration,
     éditions, actualités, visuels officiels et prix Steam.
   · Simulé pour la maquette : prix des autres boutiques et historiques.
   La forme des objets reprend le futur schéma PostgreSQL (games, offers,
   price_history, editions, updates).
   ========================================================================== */
(function () {
  "use strict";

  const TODAY = new Date("2026-11-07T09:00:00");
  const EUR_TO_TND = 3.4; // taux indicatif d'affichage
  const STEAM = window.STEAM || {};

  const STORES = {
    steam: { name: "Steam", short: "ST", tint: "#8fb8ff", platforms: ["PC"] },
    epic: { name: "Epic Games Store", short: "EG", tint: "#eef1f6", platforms: ["PC"] },
    gog: { name: "GOG", short: "GG", tint: "#7fd6c2", platforms: ["PC"] },
    rockstar: { name: "Rockstar Store", short: "RS", tint: "#f5c542", platforms: ["PC"] },
    psn: { name: "PlayStation Store", short: "PS", tint: "#6f9bff", platforms: ["PS5"] },
    xbox: { name: "Xbox Store", short: "XB", tint: "#9be37a", platforms: ["Xbox Series"] },
    nintendo: { name: "Nintendo eShop", short: "NS", tint: "#ff7b7b", platforms: ["Switch"] },
  };

  /* --- Générateur pseudo-aléatoire déterministe (mulberry32) --- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const DAY = 86400000;
  const D = (s) => new Date(s + "T00:00:00");
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const round99 = (v) => Math.max(0.99, Math.round(v) - 0.01);

  /* ----------------------------------------------------------------------
     Couche « maquette » : plateformes, offres des autres boutiques,
     historique. Tout le reste vient de Steam.
     ---------------------------------------------------------------------- */
  const MANUAL = [
    {
      id: "gta-v",
      title: "Grand Theft Auto V",
      edition: "Version améliorée",
      aliases: "GTA V GTA 5 GTAV Rockstar Los Santos",
      platforms: ["PC", "PS5", "Xbox Series"],
      studioCity: "Édimbourg",
      tagline: "Los Santos et Blaine County, version améliorée : ray tracing, chargements rapides et GTA Online inclus.",
      offers: [
        { store: "epic", price: 19.79 },
        { store: "rockstar", price: 29.99 },
        { store: "psn", price: 39.99, base: 39.99 },
        { store: "xbox", price: 39.99, base: 39.99 },
        { store: "epic", edition: "shark", price: 32.99 },
        { store: "rockstar", edition: "shark", price: 44.99 },
      ],
      editions: [
        { id: "standard", match: /Enhanced$/, name: "Standard", perks: ["Mode histoire de GTA V", "GTA Online", "Version améliorée : ray tracing, DLSS et FSR, chargements rapides"] },
        { id: "shark", match: /Shark/, name: "+ Great White Shark Card", perks: ["Tout le contenu Standard", "Carte Great White Shark : 1 250 000 GTA$ pour GTA Online"] },
      ],
      low: { price: 14.99, store: "steam", date: "2026-06-25" },
      sales: [
        { from: D("2025-11-25"), to: D("2025-12-03"), price: 17.99, store: "steam" },
        { from: D("2025-12-18"), to: D("2026-01-05"), price: 16.49, store: "steam" },
        { from: D("2026-03-19"), to: D("2026-03-27"), price: 20.99, store: "epic" },
        { from: D("2026-06-25"), to: D("2026-07-09"), price: 14.99, store: "steam" },
        { from: D("2026-10-29"), to: D("2026-11-08"), price: 19.79, store: "epic" },
      ],
      hours: 32,
    },
    {
      id: "red-dead-redemption-2",
      platforms: ["PC", "PS4", "Xbox One"],
      studioCity: "Édimbourg",
      tagline: "L'Ouest américain en 1899, par les créateurs de GTA V.",
      offers: [
        { store: "rockstar", price: 19.79 },
        { store: "epic", price: 59.99 },
        { store: "psn", price: 69.99, base: 69.99 },
        { store: "xbox", price: 69.99, base: 69.99 },
      ],
      low: { price: 14.99, store: "steam", date: "2026-06-25" },
      seed: 7,
      hours: 50,
    },
    {
      id: "cyberpunk-2077",
      platforms: ["PC", "PS5", "Xbox Series"],
      tagline: "Night City, ses implants et ses mercenaires.",
      offers: [
        { store: "gog", price: 29.99 },
        { store: "epic", price: 59.99 },
        { store: "psn", price: 59.99 },
        { store: "xbox", price: 59.99 },
      ],
      low: { price: 23.99, store: "gog", date: "2026-06-26" },
      seed: 13,
      hours: 26,
    },
    {
      id: "elden-ring",
      title: "Elden Ring",
      platforms: ["PC", "PS5", "Xbox Series"],
      tagline: "L'Entre-terre, par FromSoftware et George R. R. Martin.",
      offers: [
        { store: "psn", price: 41.99 },
        { store: "xbox", price: 59.99 },
      ],
      low: { price: 29.99, store: "steam", date: "2026-06-26" },
      seed: 21,
      hours: 59,
    },
    {
      id: "007-first-light",
      platforms: ["PC", "PS5", "Xbox Series"],
      tagline: "Les débuts de James Bond, par IO Interactive.",
      offers: [
        { store: "epic", price: 79.99 },
        { store: "psn", price: 79.99 },
        { store: "xbox", price: 79.99 },
      ],
      noEditions: true,
      seed: 31,
    },
    {
      id: "no-mans-sky",
      platforms: ["PC", "PS5", "Xbox Series", "Switch"],
      tagline: "Un univers généré à l'infini, à explorer seul ou à plusieurs.",
      offers: [
        { store: "gog", price: 58.99 },
        { store: "psn", price: 58.99 },
        { store: "xbox", price: 58.99 },
        { store: "nintendo", price: 49.99, base: 49.99 },
      ],
      seed: 41,
    },
    {
      id: "baldurs-gate-3",
      platforms: ["PC", "PS5", "Xbox Series"],
      tagline: "Le jeu de rôle de Larian dans l'univers de Donjons et Dragons.",
      offers: [
        { store: "gog", price: 47.99 },
        { store: "psn", price: 69.99, base: 69.99 },
        { store: "xbox", price: 69.99, base: 69.99 },
      ],
      low: { price: 41.99, store: "steam", date: "2026-06-26" },
      seed: 51,
      hours: 75,
    },
    {
      id: "hollow-knight-silksong",
      platforms: ["PC", "PS5", "Xbox Series", "Switch"],
      tagline: "Hornet, princesse protectrice, dans un royaume à gravir.",
      offers: [
        { store: "gog", price: 19.5 },
        { store: "psn", price: 19.99, base: 19.99 },
        { store: "nintendo", price: 19.99, base: 19.99 },
      ],
      sales: [],
    },
    {
      id: "stardew-valley",
      platforms: ["PC", "PS5", "Xbox Series", "Switch"],
      tagline: "Reprendre la ferme de son grand-père, saison après saison.",
      offers: [
        { store: "gog", price: 13.99 },
        { store: "nintendo", price: 13.99, base: 13.99 },
        { store: "psn", price: 14.99, base: 14.99 },
      ],
      low: { price: 8.39, store: "steam", date: "2026-06-26" },
      seed: 71,
      hours: 53,
    },
    {
      id: "lego-star-wars",
      title: "LEGO Star Wars : La Saga Skywalker",
      platforms: ["PC", "PS5", "Xbox Series", "Switch"],
      tagline: "Les neuf films Star Wars en briques LEGO, à jouer à deux.",
      offers: [
        { store: "epic", price: 12.49 },
        { store: "psn", price: 49.99 },
        { store: "nintendo", price: 49.99 },
      ],
      low: { price: 12.49, store: "epic", date: "2026-11-03" },
      seed: 81,
      hours: 23,
    },
    {
      id: "forza-horizon-6",
      platforms: ["PC", "Xbox Series"],
      tagline: "Le festival Horizon s'installe au Japon.",
      offers: [{ store: "xbox", price: 69.99 }],
      sales: [],
    },
    /* --- Sorties à venir (données Steam réelles) --- */
    {
      id: "fable",
      platforms: ["PC", "Xbox Series"],
      tagline: "Le retour d'Albion, par Playground Games.",
      offers: [{ store: "xbox", price: 69.99 }, { store: "xbox", edition: "premium", price: 99.99 }],
      editions: [
        { id: "standard", match: /Standard/, name: "Standard", perks: ["Jeu de base"] },
        { id: "premium", match: /Premium/, name: "Premium", perks: ["Jeu de base", "Contenus de l'édition Premium (détail sur la page officielle)"] },
      ],
    },
    { id: "kingdom-hearts-iv", title: "Kingdom Hearts IV", platforms: ["PC"], tagline: "Sora découvre Quadratum, un monde aux allures de ville réelle.", offers: [] },
    { id: "clockwork-revolution", platforms: ["PC", "Xbox Series"], tagline: "Un RPG steampunk d'inXile où chaque choix réécrit l'histoire.", offers: [] },
  ];

  /* --- Fusion : données Steam + couche maquette --- */
  const GAMES = MANUAL.map((m) => {
    const s = STEAM[m.id] || {};
    const steamPrice = s.price;
    const upcoming = !!s.comingSoon || (s.release && s.release.length === 4) || (s.release && D(s.release.length === 10 ? s.release : s.release + "-01-01") > TODAY);
    const base = steamPrice ? steamPrice.initial : (m.offers[0] && (m.offers[0].base || m.offers[0].price)) || null;
    const offers = [];
    if (steamPrice) offers.push({ store: "steam", edition: "standard", price: steamPrice.final, base: steamPrice.initial, real: true });
    m.offers.forEach((o) => offers.push({ edition: "standard", ...o, base: o.base || null }));

    // Éditions : noms et prix réels de Steam, contenus décrits par la maquette
    let editions = null;
    if (!m.noEditions) {
      const seen = new Set();
      const steamEds = (s.editions || []).filter((e) => !seen.has(e.name) && seen.add(e.name));
      if (m.editions) {
        editions = m.editions.map((e) => {
          const se = steamEds.find((x) => e.match.test(x.name));
          return { id: e.id, name: e.name, price: se ? se.price : base, perks: e.perks };
        });
        editions.forEach((e) => e.id !== "standard" && !offers.some((o) => o.store === "steam" && o.edition === e.id) && steamEds.length && offers.push({ store: "steam", edition: e.id, price: e.price, base: e.price, real: true }));
      } else if (steamEds.length > 1) {
        editions = steamEds
          .slice()
          .sort((a, b) => a.price - b.price)
          .map((e, i) => {
            let n = e.name.replace(s.name, "").replace(/^[\s:–-]+/, "");
            if (n === e.name) n = e.name.split(/\s+/).slice(-2).join(" ");
            n = n.replace(/[®™]/g, "");
            return { id: i ? "ed" + i : "standard", name: i ? n : "Standard", price: e.price, perks: i ? ["Jeu de base", "Contenus additionnels de l'édition"] : ["Jeu de base"] };
          });
      }
    }
    offers.forEach((o) => {
      if (o.base) return;
      const e = o.edition !== "standard" && editions && editions.find((x) => x.id === o.edition);
      o.base = e ? e.price : base;
    });
    const req = s.requirements && s.requirements.min && Object.keys(s.requirements.min).length > 2 ? s.requirements : null;
    return {
      id: m.id,
      appid: s.appid,
      title: m.title || (s.name || m.id).replace(/[®™]/g, ""),
      edition: m.edition,
      aliases: m.aliases || "",
      studio: (s.developers || ["—"])[0],
      publisher: (s.publishers || ["—"])[0],
      studioCity: m.studioCity,
      genres: (s.genres || []).filter((g) => g !== "Indépendant" && g !== "Accès anticipé").slice(0, 2),
      platforms: m.platforms,
      pegi: s.pegi || null,
      pegiDesc: s.pegiDesc && s.pegiDesc !== "Provisional" ? s.pegiDesc : s.pegiDesc === "Provisional" ? "Classification provisoire" : null,
      release: s.release && s.release.length === 10 ? s.release : s.release || "2027",
      releaseText: s.releaseText,
      upcoming,
      base,
      mainStore: "steam",
      img: s.img || {},
      cover: { c1: "#1f2942", c2: "#3a4768", c3: "#c8f169", motif: "orbit" },
      tagline: m.tagline,
      description: s.description,
      offers,
      editions,
      requirements: req,
      updates: (s.news || []).map((n) => ({ title: n.title, date: n.date, text: n.text, url: n.url })),
      low: m.low,
      sales: m.sales,
      seed: m.seed || 3,
      hours: m.hours,
    };
  });

  /** Historique du meilleur prix du jour, en paliers [{ from, price, store }] */
  function buildHistory(g) {
    const start = new Date(Math.max(D(g.release).getTime(), addDays(TODAY, -365).getTime()));
    const sales = (g.sales || autoSales(g, start)).slice().sort((a, b) => a.from - b.from);
    const pts = [];
    let cursor = start;
    for (const s of sales) {
      if (s.from > cursor) pts.push({ from: cursor, price: g.base, store: g.mainStore });
      pts.push({ from: s.from < cursor ? cursor : s.from, price: s.price, store: s.store });
      cursor = s.to;
    }
    if (cursor < TODAY) pts.push({ from: cursor, price: g.base, store: g.mainStore });
    return pts;
  }
  function autoSales(g, start) {
    const r = rng(g.seed);
    const out = [];
    const span = (TODAY - start) / DAY;
    const discounts = [0.2, 0.25, 0.33, 0.4, 0.5];
    let day = 30 + Math.floor(r() * 30);
    while (day < span - 45) {
      const len = 7 + Math.floor(r() * 9);
      const d = discounts[Math.floor(r() * discounts.length)];
      out.push({ from: addDays(start, day), to: addDays(start, day + len), price: round99(g.base * (1 - d)), store: g.mainStore });
      day += len + 45 + Math.floor(r() * 50);
    }
    if (g.low && g.low.price < g.base && out.length) Object.assign(out[Math.floor(out.length / 2)], { price: g.low.price, store: g.low.store });
    if (g.best && g.best.price < g.base) out.push({ from: addDays(TODAY, -(4 + Math.floor(r() * 8))), to: addDays(TODAY, 1), price: g.best.price, store: g.best.store });
    return out.filter((s) => s.price >= (g.low ? g.low.price : 0));
  }

  function bestOffer(g) {
    const std = g.offers.filter((o) => o.edition === "standard");
    return std.length ? std.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  }

  for (const g of GAMES) {
    g.best = bestOffer(g);
    g.discount = g.best && g.base ? Math.max(0, Math.round((1 - g.best.price / g.base) * 100)) : 0;
    if (!g.upcoming && g.best) {
      if (!g.low) g.low = g.discount > 0 ? { price: g.best.price, store: g.best.store, date: "2026-11-01" } : { price: g.base, store: "steam" };
      g.history = buildHistory(g);
      g.low.price = Math.min(g.low.price, ...g.history.map((p) => p.price));
      g.isLow = g.best.price <= g.low.price + 0.001 && g.low.price < g.base;
      g.neverSold = g.low.price >= g.base - 0.001;
      const gap = g.best.price / g.low.price - 1;
      g.verdict = g.neverSold ? "new" : gap <= 0.1 ? "buy" : "wait";
      g.gap = Math.round(gap * 100);
      g.saleCount = g.history.filter((p) => p.price < g.base).length;
    }
  }

  /* --- Liste de souhaits par défaut (persona : Yassine) --- */
  const DEFAULT_LIST = [
    { id: "no-mans-sky", target: 25, alert: true, added: "2026-09-02" },
    { id: "cyberpunk-2077", target: 30, alert: true, added: "2026-08-14" },
    { id: "gta-v", target: 15, alert: true, added: "2026-10-01" },
    { id: "007-first-light", target: 40, alert: true, added: "2026-10-19" },
    { id: "hollow-knight-silksong", target: 15, alert: false, added: "2026-07-22" },
    { id: "fable", target: null, alert: true, added: "2026-10-25" },
  ];

  /* --- Formatage (locale fr-FR) --- */
  const nfEur = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfInt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const fmt = {
    eur: (v) => nfEur.format(v) + " €",
    tnd: (v) => nfInt.format(Math.round(v * EUR_TO_TND)) + " DT",
    price: (v) => (PR.currency() === "TND" ? fmt.tnd(v) : fmt.eur(v)),
    alt: (v) => (PR.currency() === "TND" ? fmt.eur(v) : "≈ " + fmt.tnd(v)),
    date: (s, opts = { day: "numeric", month: "short", year: "numeric" }) => {
      if (typeof s === "string" && s.length === 4) return s;
      return new Date(typeof s === "string" ? s + "T00:00:00" : s).toLocaleDateString("fr-FR", opts);
    },
    pct: (v) => "−" + v + " %",
  };
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("pr-" + k);
        return v === null ? d : JSON.parse(v);
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("pr-" + k, JSON.stringify(v));
      } catch {
        /* navigation privée : l'état reste en mémoire */
      }
    },
  };

  const PR = (window.PR = window.PR || {});
  Object.assign(PR, {
    TODAY,
    EUR_TO_TND,
    STORES,
    GAMES,
    fmt,
    norm,
    store,
    game: (id) => GAMES.find((g) => g.id === id),
    currency: () => store.get("cur", "EUR"),
    list: () => store.get("list2", DEFAULT_LIST).filter((e) => GAMES.some((g) => g.id === e.id)),
    saveList: (l) => store.set("list2", l),
    daysUntil: (s) => (s && s.length === 10 ? Math.ceil((new Date(s + "T00:00:00") - TODAY) / DAY) : null),
  });
})();
