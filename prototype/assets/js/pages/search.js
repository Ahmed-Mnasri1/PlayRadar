/* PlayRadar — recherche et filtres (l'URL garde l'état : un lien partagé rouvre la même recherche) */
(function () {
  "use strict";
  const PR = window.PR;

  PR.page = function () {
    const p = PR.params;
    const st = {
      q: p.get("q") || "",
      plats: new Set(p.getAll("plat")),
      genres: new Set(p.getAll("genre")),
      max: +(p.get("max") || 110),
      promo: p.get("promo") === "1",
      low: p.get("low") === "1",
      when: p.get("when") || "all",
      pegi: +(p.get("pegi") || 18),
      sort: p.get("sort") || "relevance",
      view: "grid",
    };
    const form = PR.$("[data-filters]");
    const genres = [...new Set(PR.GAMES.flatMap((g) => g.genres))].sort((a, b) => a.localeCompare(b, "fr"));
    const count = (pl) => PR.GAMES.filter((g) => g.platforms.includes(pl)).length;
    const PLATS = [...new Set(PR.GAMES.flatMap((g) => g.platforms))].sort((a, b) => count(b) - count(a));

    PR.$("[data-plats]").innerHTML = PLATS.map(
      (pl) => `<label class="check"><input type="checkbox" name="plat" value="${pl}"> ${pl}<small>${PR.GAMES.filter((g) => g.platforms.includes(pl)).length}</small></label>`
    ).join("");
    PR.$("[data-genres]").innerHTML = genres.map((g) => `<button type="button" class="chip" data-genre="${g}">${g}</button>`).join("");

    function match(g) {
      const nq = PR.norm(st.q);
      if (nq && !PR.norm([g.title, g.aliases, g.studio, g.publisher, ...g.genres].join(" ")).includes(nq)) return false;
      if (st.plats.size && !g.platforms.some((x) => st.plats.has(x))) return false;
      if (st.genres.size && !g.genres.some((x) => st.genres.has(x))) return false;
      if (st.max < 110 && (!g.best || g.best.price > st.max)) return false;
      if (st.promo && !(g.discount > 0)) return false;
      if (st.low && !g.isLow) return false;
      if (st.when === "out" && g.upcoming) return false;
      if (st.when === "soon" && !g.upcoming) return false;
      if (g.pegi > st.pegi) return false;
      return true;
    }
    const sorters = {
      relevance: (a, b) => (b.isLow ? 1 : 0) - (a.isLow ? 1 : 0) || b.discount - a.discount,
      price: (a, b) => (a.best ? a.best.price : 1e9) - (b.best ? b.best.price : 1e9),
      discount: (a, b) => b.discount - a.discount,
      date: (a, b) => b.release.localeCompare(a.release),
    };

    function syncControls() {
      PR.$$("input[name=plat]", form).forEach((i) => (i.checked = st.plats.has(i.value)));
      PR.$$("[data-genre]", form).forEach((b) => b.setAttribute("aria-pressed", String(st.genres.has(b.dataset.genre))));
      form.max.value = st.max;
      PR.$("[data-max-label]").innerHTML = st.max >= 110 ? "Sans limite" : `≤ ${PR.fmt.price(st.max)}`;
      form.promo.checked = st.promo;
      form.low.checked = st.low;
      PR.$$("[data-when] button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === st.when)));
      PR.$$("[data-pegi] button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.v === st.pegi)));
      PR.$("[data-sort]").value = st.sort;
      PR.$$("[data-view] button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === st.view)));
    }

    function render() {
      const res = PR.GAMES.filter(match).sort(sorters[st.sort]);
      PR.$("[data-title]").innerHTML = st.q ? `Résultats pour <em>« ${PR.esc(st.q)} »</em>` : st.promo ? "Promos du moment" : "Tous les jeux";
      PR.$("[data-count]").innerHTML = `${res.length} jeu${res.length > 1 ? "x" : ""} <span>· prix relevés ce matin</span>`;
      PR.$(".results").classList.toggle("is-list", st.view === "list");
      PR.$("[data-results]").innerHTML = res.length
        ? res.map((g) => PR.gameCard(g)).join("")
        : `<div class="empty"><h3>Aucun jeu ne correspond</h3><p>Élargissez le prix maximum ou retirez un filtre.</p><button class="btn btn--ghost btn--sm" type="button" data-reset style="margin-top:16px">Effacer les filtres</button></div>`;

      const chips = [];
      if (st.q) chips.push(["q", `« ${st.q} »`]);
      st.plats.forEach((v) => chips.push(["plat:" + v, v]));
      st.genres.forEach((v) => chips.push(["genre:" + v, v]));
      if (st.max < 110) chips.push(["max", `≤ ${PR.fmt.price(st.max)}`]);
      if (st.promo) chips.push(["promo", "En promotion"]);
      if (st.low) chips.push(["low", "Plus bas historique"]);
      if (st.when !== "all") chips.push(["when", st.when === "out" ? "Déjà sortis" : "À venir"]);
      if (st.pegi < 18) chips.push(["pegi", `PEGI ${st.pegi} max.`]);
      PR.$("[data-active]").innerHTML = chips.map(([k, l]) => `<button type="button" class="chip is-on" data-rm="${PR.esc(k)}">${PR.esc(l)}${PR.icon("x")}</button>`).join("");
      PR.$$("[data-open-filters]").forEach((b) => (b.lastChild.textContent = chips.length ? `Filtres (${chips.length})` : "Filtres"));

      const u = new URLSearchParams();
      if (st.q) u.set("q", st.q);
      st.plats.forEach((v) => u.append("plat", v));
      st.genres.forEach((v) => u.append("genre", v));
      if (st.max < 110) u.set("max", st.max);
      if (st.promo) u.set("promo", "1");
      if (st.low) u.set("low", "1");
      if (st.when !== "all") u.set("when", st.when);
      if (st.pegi < 18) u.set("pegi", st.pegi);
      if (st.sort !== "relevance") u.set("sort", st.sort);
      ["fi", "shot"].forEach((k) => p.has(k) && u.set(k, p.get(k)));
      history.replaceState(null, "", "?" + u.toString());
      PR.fixTypo && PR.fixTypo(PR.$("main"));
    }

    function reset() {
      Object.assign(st, { q: "", max: 110, promo: false, low: false, when: "all", pegi: 18 });
      st.plats.clear();
      st.genres.clear();
      const si = PR.$(".search__input");
      if (si) si.value = "";
      syncControls();
      render();
    }

    form.addEventListener("change", (e) => {
      const t = e.target;
      if (t.name === "plat") t.checked ? st.plats.add(t.value) : st.plats.delete(t.value);
      if (t.name === "promo") st.promo = t.checked;
      if (t.name === "low") st.low = t.checked;
      render();
    });
    form.max.addEventListener("input", () => {
      st.max = +form.max.value;
      syncControls();
      render();
    });
    document.addEventListener("click", (e) => {
      const g = e.target.closest("[data-genre]");
      if (g) {
        st.genres.has(g.dataset.genre) ? st.genres.delete(g.dataset.genre) : st.genres.add(g.dataset.genre);
        syncControls();
        render();
      }
      const w = e.target.closest("[data-when] button");
      if (w) (st.when = w.dataset.v), syncControls(), render();
      const pg = e.target.closest("[data-pegi] button");
      if (pg) (st.pegi = +pg.dataset.v), syncControls(), render();
      const v = e.target.closest("[data-view] button");
      if (v) (st.view = v.dataset.v), syncControls(), render();
      const rm = e.target.closest("[data-rm]");
      if (rm) {
        const [k, val] = rm.dataset.rm.split(":");
        if (k === "q") st.q = "";
        if (k === "plat") st.plats.delete(val);
        if (k === "genre") st.genres.delete(val);
        if (k === "max") st.max = 110;
        if (k === "promo") st.promo = false;
        if (k === "low") st.low = false;
        if (k === "when") st.when = "all";
        if (k === "pegi") st.pegi = 18;
        syncControls();
        render();
      }
      if (e.target.closest("[data-reset]")) reset();
      if (e.target.closest("[data-open-filters]")) form.classList.add("is-open");
      if (e.target.closest("[data-close-filters]")) form.classList.remove("is-open");
    });
    PR.$("[data-sort]").addEventListener("change", (e) => {
      st.sort = e.target.value;
      render();
    });
    document.addEventListener("pr:currency", syncControls);

    syncControls();
    render();
  };
})();
