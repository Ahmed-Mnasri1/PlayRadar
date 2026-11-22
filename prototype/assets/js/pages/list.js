/* PlayRadar — ma liste de souhaits et mes alertes */
(function () {
  "use strict";
  const PR = window.PR;
  const { fmt, icon, money, esc } = PR;

  PR.page = function () {
    let tab = "all",
      sort = "close";

    const enrich = () =>
      PR.list()
        .map((e) => {
          const g = PR.game(e.id);
          if (!g) return null;
          const now = g.best ? g.best.price : null;
          const hit = !g.upcoming && e.target != null && now <= e.target;
          const state = g.upcoming ? "soon" : hit ? "hit" : "wait";
          const close = e.target && now ? Math.min(100, (e.target / now) * 100) : 0;
          return { e, g, now, hit, state, close };
        })
        .filter(Boolean);

    function kpis(items) {
      const active = items.filter((i) => i.e.alert).length;
      const hits = items.filter((i) => i.hit && i.e.alert);
      const saved = items.filter((i) => !i.g.upcoming && i.now).reduce((s, i) => s + (i.g.base - i.now), 0);
      PR.$("[data-kpis]").innerHTML = `
        <div class="kpi"><small>${icon("bookmark")}Jeux suivis</small><b>${items.length}</b></div>
        <div class="kpi"><small>${icon("bell")}Alertes actives</small><b>${active}</b></div>
        <div class="kpi kpi--hot"><small>${icon("bell-ring")}Sous votre prix cible</small><b>${hits.length}</b></div>
        <div class="kpi"><small>${icon("trending-down")}Économie vs prix de base</small><b class="t-radar">${money(saved)}</b></div>`;
      PR.$("[data-hits]").hidden = !hits.length;
      PR.$("[data-hits]").innerHTML = `<div class="hits__head">${icon("bell-ring")}${hits.length} alerte${hits.length > 1 ? "s" : ""} déclenchée${hits.length > 1 ? "s" : ""}<small>e-mail envoyé ce matin à 06:05</small></div>
        ${hits
          .map(
            (i) => `<div class="hit"><div class="cover cover--xxs">${PR.cover(i.g, { title: false })}</div>
            <p><b>${esc(i.g.title)}</b> est à <b class="t-radar">${fmt.eur(i.now)}</b> chez ${PR.STORES[i.g.best.store].name}, sous votre cible de ${fmt.eur(i.e.target)}.</p>
            <button class="btn btn--primary btn--sm" data-out="${i.g.best.store}">Voir l'offre ${icon("arrow-up-right")}</button></div>`
          )
          .join("")}`;
    }

    function row(i) {
      const { e, g, now, hit } = i;
      let status;
      if (g.upcoming) status = `<span class="status" style="color:var(--sky)">Alerte à la sortie · ${g.release.length === 4 ? g.release : fmt.date(g.release, { day: "numeric", month: "short" })}</span>`;
      else if (e.target == null) status = `<span class="status muted">Sans prix cible</span>`;
      else if (hit) status = `<span class="status t-radar">✓ Sous la cible</span>`;
      else status = `<span class="status t-signal">Encore ${fmt.eur(now - e.target)} de baisse</span>`;
      return `<article class="wrow ${hit ? "is-hit" : ""} ${e.alert ? "" : "is-off"}" data-id="${g.id}">
        <a class="cover" href="jeu.html?id=${g.id}" aria-hidden="true" tabindex="-1">${PR.cover(g, { title: false })}</a>
        <div class="wrow__title"><a href="jeu.html?id=${g.id}">${esc(g.title)}</a><small>Ajouté le ${fmt.date(e.added, { day: "numeric", month: "short" })} · ${g.platforms.map((p) => p.replace(" Series", "")).join(", ")}</small></div>
        ${PR.sparkline(g)}
        <div class="wrow__now">${now ? money(now, "main", "price") : '<span class="price">—</span>'}<small>${g.upcoming ? "Précommande · " : ""}${g.best ? PR.STORES[g.best.store].name : "Prix à venir"}</small></div>
        <div class="target">
          <div class="target__row"><span>Ma cible</span>${g.upcoming ? "" : `<input type="number" min="1" step="0.5" value="${e.target ?? ""}" placeholder="—" aria-label="Prix cible pour ${esc(g.title)} en euros" data-target />`}</div>
          <div class="bar"><i style="--w:${g.upcoming ? 0 : i.close}%"></i></div>
          ${status}
        </div>
        <label class="switch" title="Alerte e-mail"><input type="checkbox" ${e.alert ? "checked" : ""} aria-label="Alerte e-mail pour ${esc(g.title)}" data-toggle /><span></span></label>
        <button class="icon-btn" type="button" aria-label="Retirer ${esc(g.title)} de ma liste" data-remove>${icon("trash-2")}</button>
      </article>`;
    }

    function render() {
      const items = enrich();
      kpis(items);
      const sorters = {
        close: (a, b) => (b.hit - a.hit) || b.close - a.close,
        added: (a, b) => b.e.added.localeCompare(a.e.added),
        price: (a, b) => a.now - b.now,
      };
      const shown = items.filter((i) => tab === "all" || i.state === tab).sort(sorters[sort]);
      PR.$("[data-rows]").innerHTML = shown.length
        ? shown.map(row).join("")
        : `<div class="empty"><h3>Rien ici pour l'instant</h3><p>Ajoutez un jeu depuis sa fiche avec « Ajouter à ma liste ».</p></div>`;
      const feed = [
        ...items.filter((i) => i.hit).map((i) => ({ ic: "bell-ring", t: `<b>${esc(i.g.title)}</b> sous votre cible (${fmt.eur(i.now)})`, d: "Aujourd'hui, 06:05" })),
        { ic: "calendar-clock", t: "<b>Fable</b> : précommandes ouvertes, sortie le 23 février 2027", d: "3 nov., 06:05" },
        { ic: "trending-down", t: "<b>Grand Theft Auto V</b> : −34 % chez Epic, encore au-dessus de votre cible", d: "29 oct., 06:05" },
      ];
      PR.$("[data-feed]").innerHTML = feed.map((f) => `<li>${icon(f.ic)}<div><p>${f.t}</p><small>${f.d}</small></div></li>`).join("");
      PR.fixTypo(PR.$("main"));
    }

    const update = (id, patch) => {
      PR.upsertList(id, patch);
      render();
    };

    PR.$("[data-rows]").addEventListener("change", (e) => {
      const r = e.target.closest(".wrow");
      if (!r) return;
      if (e.target.matches("[data-target]")) {
        const v = parseFloat(e.target.value);
        update(r.dataset.id, { target: isNaN(v) ? null : v, alert: !isNaN(v) || PR.list().find((x) => x.id === r.dataset.id).alert });
        PR.toast(isNaN(v) ? "Prix cible retiré" : `Nouvelle cible : ${fmt.eur(v)} pour <b>${esc(PR.game(r.dataset.id).title)}</b>`, "target");
      }
      if (e.target.matches("[data-toggle]")) {
        update(r.dataset.id, { alert: e.target.checked });
        PR.toast(e.target.checked ? "Alerte activée" : "Alerte mise en pause", e.target.checked ? "bell" : "bell");
      }
    });
    document.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-remove]");
      if (rm) {
        const r = rm.closest(".wrow");
        r.classList.add("is-leaving");
        setTimeout(() => {
          PR.removeFromList(r.dataset.id);
          render();
          PR.toast(`<b>${esc(PR.game(r.dataset.id).title)}</b> retiré de votre liste`, "trash-2");
        }, 200);
      }
      const t = e.target.closest("[data-tab] button");
      if (t) {
        tab = t.dataset.v;
        PR.$$("[data-tab] button").forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
        render();
      }
      const f = e.target.closest("[data-freq] button");
      if (f) PR.$$("[data-freq] button").forEach((b) => b.setAttribute("aria-pressed", String(b === f)));
      if (e.target.closest("[data-add]")) PR.$(".search__input")?.focus();
      const out = e.target.closest("[data-out]");
      if (out) PR.toast(`Redirection vers la page officielle sur <b>${PR.STORES[out.dataset.out].name}</b> (nouvel onglet)`, "external-link");
    });
    PR.$("[data-sort]").addEventListener("change", (e) => {
      sort = e.target.value;
      render();
    });
    render();
  };
})();
