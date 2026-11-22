/* PlayRadar — page d'accueil */
(function () {
  "use strict";
  const PR = window.PR;

  /* Repères du radar : un jeu, une position, une étiquette */
  const BLIPS = [
    { id: "gta-v", x: 70, y: 22, tag: () => `<span class="badge badge--line blip__tag" style="background:var(--panel)">Mise à jour</span>` },
    { id: "fable", x: 24, y: 30, left: true, tag: () => `<span class="badge badge--signal blip__tag">Précommande</span>` },
    { id: "no-mans-sky", x: 76, y: 66, tag: () => `<span class="badge badge--radar blip__tag">${PR.fmt.pct(PR.game("no-mans-sky").discount)}</span>` },
    { id: "lego-star-wars", x: 30, y: 74, left: true, tag: () => `<span class="badge badge--low blip__tag" style="background:var(--panel)">Plus bas historique</span>` },
    { id: "hollow-knight-silksong", x: 47, y: 46, tag: () => "" },
  ];

  PR.page = function () {
    const T = 6; // durée d'un tour de balayage (s), identique au CSS
    PR.$("[data-blips]").innerHTML = BLIPS.map((b) => {
      const g = PR.game(b.id);
      const a = (Math.atan2(b.x - 50, -(b.y - 50)) * 180) / Math.PI;
      const delay = (((a + 360) % 360) / 360) * T;
      return `<div class="blip ${b.left ? "blip--left" : ""}" style="--x:${b.x}%;--y:${b.y}%;--d:${delay.toFixed(2)}s">
        <div class="blip__dot"><div class="cover">${PR.cover(g, { title: false })}</div></div>${b.tag()}
      </div>`;
    }).join("");

    /* À la une : visuel officiel en plein cadre */
    const f = PR.game("gta-v");
    const news = f.updates[0];
    PR.$("[data-feature]").innerHTML = `<a class="feature" href="jeu.html?id=${f.id}" data-wf="Contenu : à la une">
      <img class="feature__art" src="${f.img.hero}" alt="">
      <div class="feature__copy">
        <p class="eyebrow">À la une${news ? ` · actualité du ${PR.fmt.date(news.date, { day: "numeric", month: "long" })}` : ""}</p>
        <h2>${PR.esc(f.title)}</h2>
        <p class="feature__lead">${PR.esc(f.tagline)}</p>
        <div class="feature__row">
          <span class="feature__price">${PR.money(f.best.price, "main", "price")}<small>${PR.STORES[f.best.store].name} · ${PR.fmt.pct(f.discount)}</small></span>
          ${PR.badge.verdict(f)}
          <span class="btn btn--primary">Comparer les prix ${PR.icon("arrow-right", "m-arrow")}</span>
        </div>
      </div>
      <div class="cover feature__cover">${PR.cover(f)}</div>
    </a>`;

    const deals = PR.GAMES.filter((g) => !g.upcoming && g.discount > 0 && g.id !== "gta-v")
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 5);
    PR.$("[data-deals]").innerHTML = deals.map((g) => PR.gameCard(g)).join("");

    const up = PR.GAMES.filter((g) => g.upcoming).sort((a, b) => (a.release.length === 4) - (b.release.length === 4) || a.release.localeCompare(b.release));
    PR.$("[data-upcoming]").innerHTML = up
      .map((g) => {
        const precise = g.release.length === 10;
        const d = precise ? new Date(g.release + "T00:00:00") : null;
        const n = PR.daysUntil(g.release);
        const eds = (g.editions || []).length;
        return `<a class="ucard" href="jeu.html?id=${g.id}">
          <div class="cover">${PR.cover(g, { title: false })}</div>
          <div class="ucard__body">
            <div class="ucard__date"><b>${precise ? `${d.getDate()} ${d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}` : g.release}</b><span>${precise ? (n > 60 ? d.getFullYear() : "J−" + n) : "Date à venir"}</span></div>
            <h3>${PR.esc(g.title)}</h3>
            <p class="ucard__meta">${g.genres[0] || ""} · ${g.platforms.map((p) => p.replace(" Series", "")).join(", ")}</p>
            <p class="ucard__price">${g.best ? `Précommande dès ${PR.money(g.best.price, "main", "price")}<br>${eds || 1} édition${eds > 1 ? "s" : ""} comparée${eds > 1 ? "s" : ""}` : "Prix pas encore annoncé<br>Alerte à l'ouverture des précommandes"}</p>
          </div>
        </a>`;
      })
      .join("");
  };
})();
