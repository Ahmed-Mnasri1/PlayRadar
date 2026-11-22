/* PlayRadar — fiche jeu : comparer, comprendre, agir */
(function () {
  "use strict";
  const PR = window.PR;
  const { fmt, icon, money, esc } = PR;

  PR.page = function () {
    const g = PR.game(PR.params.get("id")) || PR.game("gta-v");
    document.title = `${g.title} — prix, historique et éditions | PlayRadar`;
    const S = (id) => PR.STORES[id];
    const best = g.best;
    const editionIds = [...new Set(g.offers.map((o) => o.edition))];
    const edName = (id) => (g.editions || []).find((e) => e.id === id)?.name || "Standard";
    const releaseLong = g.release.length === 4 ? g.release : fmt.date(g.release, { day: "numeric", month: "long", year: "numeric" });

    /* ---------- Carte « décider » : prix, verdict, action principale ---------- */
    function decideCard() {
      let why = "",
        gauge = "",
        cta,
        priceBlock;
      if (!best) {
        priceBlock = `<div class="decide__price"><span class="price price--tba">Prix à venir</span></div>`;
        why = `Sortie prévue en <b>${releaseLong}</b>. Le prix n'est pas encore annoncé par l'éditeur : PlayRadar vous prévient dès l'ouverture des précommandes.`;
        cta = `<button class="btn btn--primary" data-alert>${icon("bell-plus")}Me prévenir</button><button class="btn btn--ghost" data-wish-alt>${icon("bookmark")}Suivre</button>`;
      } else if (g.upcoming) {
        why = `Sortie le <b>${releaseLong}</b>. ${g.discount > 0 ? `Précommande à <b>${fmt.pct(g.discount)}</b> chez ${S(best.store).name}.` : "Même prix de lancement sur les boutiques relevées."}`;
        cta = `<button class="btn btn--primary" data-out="${best.store}">Précommander ${icon("arrow-up-right")}</button>
               <button class="btn btn--ghost" data-alert>${icon("bell-plus")}Alerte de prix</button>`;
      } else {
        const p = Math.max(0, Math.min(100, ((best.price - g.low.price) / (g.base - g.low.price || 1)) * 100));
        if (!g.neverSold)
          gauge = `<div class="gauge" style="--p:${p}%" role="img" aria-label="Prix actuel situé entre le plus bas historique et le prix de base"><span class="gauge__pin"></span>
          <div class="gauge__ends"><span>Plus bas ${fmt.eur(g.low.price)}</span><span>Prix de base ${fmt.eur(g.base)}</span></div></div>`;
        why =
          g.verdict === "new"
            ? `<b>Jamais soldé</b> depuis sa sortie : le prix de lancement est le seul prix connu. Fixez une alerte pour la première promotion.`
            : g.verdict === "wait"
              ? `Le meilleur prix est <b>${g.gap} % au-dessus</b> du plus bas historique (${fmt.eur(g.low.price)}, ${fmt.date(g.low.date || PR.TODAY, { month: "long", year: "numeric" })}). Soldé ${g.saleCount} fois en 12 mois : une baisse est probable.`
              : g.isLow
                ? `<b>Plus bas historique atteint</b> : ce jeu n'a jamais été aussi bon marché chez une boutique officielle.`
                : `À seulement <b>${g.gap} %</b> du plus bas historique (${fmt.eur(g.low.price)}).`;
        const alertFirst = g.verdict !== "buy";
        const alertBtn = `<button class="btn ${alertFirst ? "btn--primary" : "btn--ghost"}" data-alert>${icon("bell-plus")}Créer une alerte</button>`;
        const offerBtn = `<button class="btn ${alertFirst ? "btn--ghost" : "btn--primary"}" data-out="${best.store}">Voir l'offre ${icon("arrow-up-right")}</button>`;
        cta = alertFirst ? alertBtn + offerBtn : offerBtn + alertBtn;
      }
      priceBlock =
        priceBlock ||
        `<div class="decide__price">${money(best.price, "main", "price")}<span class="decide__alt">${money(best.price, "alt")}</span></div>
        <div class="decide__store">${PR.storeChip(best.store)}${g.discount > 0 ? `<span class="badge badge--signal">${fmt.pct(g.discount)}</span>` : ""}</div>`;
      return `<aside class="decide enter" style="--i:3" data-wf="Action : décider">
        <div class="decide__label"><span>${!best ? "À venir" : g.upcoming ? "Précommande" : "Meilleur prix du jour"}</span>${PR.badge.verdict(g) || PR.badge.preorder(g)}</div>
        ${priceBlock}
        ${gauge}
        <p class="decide__why">${why}</p>
        <div class="decide__cta">${cta}</div>
        <p class="decide__time">${icon("clock")}Relevé aujourd'hui à 06:00 · boutiques officielles uniquement</p>
      </aside>`;
    }

    /* ---------- Tableau comparatif ---------- */
    function priceRows(ed) {
      const rows = g.offers.filter((o) => o.edition === ed).sort((a, b) => a.price - b.price);
      if (!rows.length) return `<tr><td colspan="6" class="muted">Aucune boutique ne propose encore ce jeu.</td></tr>`;
      const min = rows[0].price;
      return rows
        .map((o) => {
          const disc = Math.round((1 - o.price / o.base) * 100);
          return `<tr class="${o.price === min ? "is-best" : ""}">
            <td>${PR.storeChip(o.store)}${o.price === min ? '<span class="best-tag">Meilleur prix</span>' : ""}</td>
            <td class="muted">${S(o.store).platforms.join(", ")}</td>
            <td class="num price">${money(o.price)}${o.real ? '<i class="real-dot" title="Prix réel relevé sur l\'API Steam"></i>' : ""}</td>
            <td class="num">${disc > 0 ? `<span class="badge badge--signal">${fmt.pct(disc)}</span>` : '<span class="muted">—</span>'}</td>
            <td class="num alt">${fmt.tnd(o.price)}</td>
            <td class="num"><button class="btn btn--ghost btn--sm" data-out="${o.store}"><span>Voir l'offre</span>${icon("arrow-up-right")}</button></td>
          </tr>`;
        })
        .join("");
    }

    /* ---------- Statistiques de l'historique ---------- */
    function stats(months) {
      const t1 = PR.TODAY.getTime();
      const t0 = Math.max(g.history[0].from.getTime(), t1 - months * 30.44 * 86400000);
      let sum = 0;
      g.history.forEach((p, i) => {
        const a = Math.max(p.from.getTime(), t0);
        const b = Math.min(i < g.history.length - 1 ? g.history[i + 1].from.getTime() : t1, t1);
        if (b > a) sum += p.price * (b - a);
      });
      return `<div class="stat"><small>Prix actuel</small><b class="t-radar">${money(best.price)}</b></div>
        <div class="stat"><small>Plus bas historique</small><b class="t-signal">${money(g.low.price)}</b></div>
        <div class="stat"><small>Prix moyen (${months} mois)</small><b>${money(sum / (t1 - t0))}</b></div>
        <div class="stat"><small>Promotions (12 mois)</small><b>${g.saleCount}</b></div>`;
    }

    /* ---------- Éditions ---------- */
    function editionsHtml() {
      const eds = g.editions || [{ id: "standard", name: "Standard", price: g.base, perks: ["Jeu de base"] }];
      const bestOf = (id) => Math.min(...g.offers.filter((o) => o.edition === id).map((o) => o.price), Infinity);
      const stdBest = bestOf("standard");
      return eds
        .map((e, i) => {
          const b = bestOf(e.id);
          const extra = b - stdBest;
          const rec = i > 0 && isFinite(b) && isFinite(stdBest) && extra <= stdBest * 0.55;
          return `<article class="edition ${rec ? "is-rec" : ""}">
            <div class="edition__head"><h3>${esc(e.name)}</h3>${rec ? `<span class="badge badge--radar">Bon rapport</span>` : ""}</div>
            <div class="edition__price">${e.price ? money(e.price) : "—"}</div>
            ${isFinite(b) ? `<p class="edition__best">Meilleur prix : ${money(b, "main", "price")}${i > 0 && extra > 0 ? ` · +${fmt.eur(extra)} par rapport à Standard` : ""}</p>` : ""}
            <ul>${e.perks.map((p) => `<li>${icon("check")}${esc(p)}</li>`).join("")}</ul>
          </article>`;
        })
        .join("");
    }

    const req = g.requirements;
    const sections = [
      ["prix", "Prix"],
      g.history && ["historique", "Historique"],
      ["editions", "Éditions"],
      ["apropos", "À propos"],
      req && ["config", "Configuration"],
      g.updates.length && ["maj", "Mises à jour"],
    ].filter(Boolean);

    const heroBg = g.img.hero
      ? `<div class="game-hero__art" aria-hidden="true"><img src="${g.img.hero}" alt=""></div>`
      : `<div class="game-hero__bg" aria-hidden="true">${PR.cover(g, { title: false })}</div>`;

    PR.$("[data-game]").innerHTML = `
      <section class="game-hero ${g.img.hero ? "has-art" : ""}" aria-labelledby="game-h">
        ${heroBg}
        <div class="wrap game-hero__in">
          <nav class="crumbs" aria-label="Fil d'Ariane"><a href="index.html">Accueil</a>${icon("chevron-right")}<a href="recherche.html">Jeux</a>${icon("chevron-right")}<span>${esc(g.title)}</span></nav>
          <div class="game-hero__grid">
            <div class="cover game-hero__cover enter" style="--i:0">${PR.cover(g)}</div>
            <div class="game-hero__info" data-wf="En-tête de fiche">
              <div class="game-hero__tags enter" style="--i:1">${g.platforms.map((p) => `<span class="plat">${p}</span>`).join("")}${g.pegi ? PR.badge.pegi(g) : ""}</div>
              <h1 id="game-h" class="enter" style="--i:1">${esc(g.title)}${g.edition ? `<small>${esc(g.edition)}</small>` : ""}</h1>
              <p class="game-hero__meta enter" style="--i:2"><span><a href="recherche.html?q=${encodeURIComponent(g.studio)}">${esc(g.studio)}</a></span>${g.publisher !== g.studio ? `<span>${esc(g.publisher)}</span>` : ""}${g.genres.length ? `<span>${g.genres.join(", ")}</span>` : ""}<span>${g.upcoming ? "Sortie " + (g.release.length === 4 ? "en " : "le ") : "Sorti le "}${g.release.length === 4 ? g.release : fmt.date(g.release)}</span></p>
              <p class="game-hero__tagline enter" style="--i:2">${esc(g.tagline || "")}</p>
              <div class="game-hero__actions enter" style="--i:3">
                <button class="btn btn--ghost" data-wish>${icon("bookmark")}<span>Ajouter à ma liste</span></button>
                <a class="btn btn--ghost" href="#editions">${icon("layers")}Comparer les éditions</a>
              </div>
            </div>
            ${decideCard()}
          </div>
        </div>
      </section>

      <nav class="subnav" aria-label="Sections de la fiche"><div class="wrap subnav__in">${sections.map(([id, l]) => `<a href="#${id}">${l}</a>`).join("")}</div></nav>

      <div class="wrap game-body">
        <div class="game-main">
          <section class="panel" id="prix" aria-labelledby="prix-h" data-wf="Contenu : comparateur">
            <div class="panel__head">
              <div><h2 id="prix-h">Comparer les prix</h2><p class="panel__sub">${g.offers.filter((o) => o.edition === "standard").length} boutiques officielles · liens directs</p></div>
              ${editionIds.length > 1 ? `<div class="seg" role="group" aria-label="Édition" data-ed>${editionIds.map((e, i) => `<button type="button" data-v="${e}" aria-pressed="${i === 0}">${esc(edName(e))}</button>`).join("")}</div>` : ""}
            </div>
            <div style="overflow-x:auto"><table class="ptable">
              <thead><tr><th>Boutique</th><th>Plateforme</th><th class="num">Prix</th><th class="num">Remise</th><th class="num">En dinars</th><th><span hidden>Action</span></th></tr></thead>
              <tbody data-rows>${priceRows("standard")}</tbody>
            </table></div>
            <p class="ptable-note">${icon("info")}<span><i class="real-dot"></i> Prix Steam réel, relevé sur l'API Steam le 7 nov. 2026. Autres boutiques simulées pour la maquette. 1 € ≈ ${String(PR.EUR_TO_TND).replace(".", ",")} DT (indicatif).</span></p>
          </section>

          ${
            g.history
              ? `<section class="panel" id="historique" aria-labelledby="hist-h" data-wf="Contenu : historique">
            <div class="panel__head">
              <div><h2 id="hist-h">Historique des prix</h2><p class="panel__sub">Meilleur prix du jour, toutes boutiques confondues (simulé)</p></div>
              <div class="seg" role="group" aria-label="Période" data-range>
                <button type="button" data-v="3">3 mois</button><button type="button" data-v="6">6 mois</button><button type="button" data-v="12" aria-pressed="true">12 mois</button>
              </div>
            </div>
            <div class="chart-box" data-chart></div>
            <div class="chart-legend"><span><i></i>Meilleur prix du jour</span><span><i class="dash"></i>Plus bas historique : ${fmt.eur(g.low.price)}</span></div>
            <div class="stats" data-stats>${stats(12)}</div>
          </section>`
              : ""
          }

          <section class="panel" id="editions" aria-labelledby="ed-h">
            <div class="panel__head"><div><h2 id="ed-h">Éditions${g.upcoming ? " et précommandes" : ""}</h2><p class="panel__sub">Noms et prix des éditions relevés sur Steam</p></div></div>
            <div class="editions">${editionsHtml()}</div>
          </section>

          <section class="panel" id="apropos" aria-labelledby="ab-h">
            <div class="panel__head"><div><h2 id="ab-h">À propos du jeu</h2><p class="panel__sub">Description officielle (Steam)</p></div></div>
            <p class="about">${esc(g.description || "")}</p>
          </section>

          ${
            req
              ? `<section class="panel" id="config" aria-labelledby="cfg-h">
            <div class="panel__head"><div><h2 id="cfg-h">Configuration requise (PC)</h2><p class="panel__sub">Source : page Steam officielle</p></div><button class="btn btn--ghost btn--sm" data-soon="« Mon PC peut-il le lancer ? » (bonus)">${icon("monitor")}Mon PC peut-il le lancer ?</button></div>
            <div class="req">
              ${[["Minimale", req.min], ["Recommandée", req.rec]].filter(([, r]) => r).map(([t, r]) => `<div><h3>${t}</h3><dl>${Object.entries(r).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>`).join("")}
            </div>
          </section>`
              : ""
          }

          ${
            g.updates.length
              ? `<section class="panel" id="maj" aria-labelledby="maj-h">
            <div class="panel__head"><div><h2 id="maj-h">Mises à jour et actualités</h2><p class="panel__sub">Annonces officielles publiées sur Steam (en anglais)</p></div></div>
            <div class="timeline">${g.updates
              .map((u) => `<article class="tl-item"><p class="tl-ver">${fmt.date(u.date, { day: "numeric", month: "short" })}<small>${u.date.slice(0, 4)}</small></p><div><h3>${esc(u.title)}</h3><p class="tl-text">${esc(u.text)}…</p><a class="link-more" href="${esc(u.url)}" target="_blank" rel="noopener noreferrer">Lire l'annonce ${icon("arrow-up-right")}</a></div></article>`)
              .join("")}</div>
          </section>`
              : ""
          }
        </div>

        <aside class="game-side">
          <section class="side-card" aria-labelledby="facts-h">
            <h2 id="facts-h">${icon("info")}Infos clés</h2>
            <dl class="facts">
              <dt>Développeur</dt><dd>${esc(g.studio)}${g.studioCity ? ` (${g.studioCity})` : ""}</dd>
              <dt>Éditeur</dt><dd>${esc(g.publisher)}</dd>
              <dt>Sortie (PC)</dt><dd>${g.release.length === 4 ? g.release : fmt.date(g.release)}</dd>
              ${g.pegi ? `<dt>Classification</dt><dd>PEGI ${g.pegi}</dd>` : ""}
              ${g.hours ? `<dt>Histoire principale</dt><dd>≈ ${g.hours} h</dd>` : ""}
            </dl>
            ${g.pegiDesc ? `<p class="facts__note">${esc(g.pegiDesc)}</p>` : ""}
          </section>
          <section class="side-card" aria-labelledby="pay-h" data-wf="Bloc : payer depuis la Tunisie">
            <h2 id="pay-h">${icon("globe")}Payer depuis la Tunisie</h2>
            <p>${best ? `${esc(g.title)} coûte ${money(best.price, "alt")} au meilleur prix. ` : ""}Trois façons de régler en devises :</p>
            <div class="pay-list">
              <a href="#" data-soon="Guide : Carte Technologique Internationale">${icon("credit-card")}<span>Carte Technologique Internationale<small>Délivrée par votre banque, paiement en devises</small></span>${icon("chevron-right")}</a>
              <a href="#" data-soon="Guide : cartes cadeaux">${icon("gift")}<span>Cartes cadeaux des boutiques<small>Créditez votre compte ${best ? S(best.store).name : "Steam"}</small></span>${icon("chevron-right")}</a>
              <a href="#" data-soon="Guide : revendeurs locaux">${icon("store")}<span>Revendeurs locaux<small>Clés et cartes payables en dinars</small></span>${icon("chevron-right")}</a>
            </div>
          </section>
        </aside>
      </div>

      <div class="mobile-buy">
        <div>${best ? money(best.price, "main", "price") : '<span class="price">Prix à venir</span>'}<small>${best ? S(best.store).name + (g.discount > 0 ? " · " + fmt.pct(g.discount) : "") : releaseLong}</small></div>
        <button class="btn btn--primary btn--sm" data-alert>${icon("bell-plus")}Alerte</button>
        ${best ? `<button class="btn btn--ghost btn--sm" data-out="${best.store}">Voir ${icon("arrow-up-right")}</button>` : ""}
      </div>`;

    /* ---------- Interactions ---------- */
    let months = 12;
    const chartEl = PR.$("[data-chart]");
    const drawChart = () => chartEl && PR.priceChart(chartEl, g, months);
    if (chartEl) {
      drawChart();
      chartEl.classList.add("is-drawn");
      let to;
      new ResizeObserver(() => {
        clearTimeout(to);
        to = setTimeout(drawChart, 120);
      }).observe(chartEl);
    }

    const wishBtn = PR.$("[data-wish]");
    const syncWish = () => {
      const on = PR.inList(g.id);
      wishBtn.classList.toggle("is-in", on);
      wishBtn.innerHTML = `${icon(on ? "bookmark-check" : "bookmark")}<span>${on ? "Dans ma liste" : "Ajouter à ma liste"}</span>`;
    };
    syncWish();

    document.addEventListener("click", (e) => {
      const ed = e.target.closest("[data-ed] button");
      if (ed) {
        PR.$$("[data-ed] button").forEach((b) => b.setAttribute("aria-pressed", String(b === ed)));
        PR.$("[data-rows]").innerHTML = priceRows(ed.dataset.v);
      }
      const r = e.target.closest("[data-range] button");
      if (r) {
        months = +r.dataset.v;
        PR.$$("[data-range] button").forEach((b) => b.setAttribute("aria-pressed", String(b === r)));
        drawChart();
        PR.$("[data-stats]").innerHTML = stats(months);
      }
      if (e.target.closest("[data-alert]")) PR.alertDialog(g, syncWish);
      if (e.target.closest("[data-wish], [data-wish-alt]")) {
        if (PR.inList(g.id)) {
          PR.removeFromList(g.id);
          PR.toast(`${esc(g.title)} retiré de votre liste`, "bookmark");
        } else {
          PR.upsertList(g.id, {});
          PR.toast(`${esc(g.title)} ajouté à votre liste`, "bookmark-check");
        }
        syncWish();
      }
      const out = e.target.closest("[data-out]");
      if (out) PR.toast(`Redirection vers la page officielle du jeu sur <b>${S(out.dataset.out).name}</b> (nouvel onglet)`, "external-link");
    });
    document.addEventListener("pr:currency", drawChart);

    /* Onglet actif de la sous-navigation */
    const links = PR.$$(".subnav a");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && links.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + en.target.id))),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(([id]) => io.observe(document.getElementById(id)));
    links[0]?.classList.add("is-active");
  };
})();
