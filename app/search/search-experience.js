"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GameGrid } from "../components";
import { normalize } from "../../lib/games";

export function SearchExperience({ games, initialParams }) {
  const router = useRouter();
  const [query, setQuery] = useState(String(initialParams.q ?? ""));
  const [platform, setPlatform] = useState(String(initialParams.platform ?? ""));
  const [maxPrice, setMaxPrice] = useState(String(initialParams.maxPrice ?? ""));
  const [promosOnly, setPromosOnly] = useState(initialParams.promos === "1");
  const [when, setWhen] = useState(String(initialParams.when ?? "all"));
  const [sort, setSort] = useState("relevance");

  const platforms = useMemo(() => [...new Set(games.flatMap((game) => game.platforms))].sort(), [games]);
  const results = useMemo(() => {
    const q = normalize(query);
    const ceiling = maxPrice === "" ? Infinity : Number(maxPrice);
    return games
      .filter((game) => {
        const terms = normalize([game.title, game.aliases, game.studio, game.publisher, ...game.genres].join(" "));
        return (
          (!q || terms.includes(q)) &&
          (!platform || game.platforms.includes(platform)) &&
          (!Number.isFinite(ceiling) || (game.best && game.best.price <= ceiling)) &&
          (!promosOnly || game.discount > 0) &&
          (when === "all" || (when === "upcoming" ? game.upcoming : !game.upcoming))
        );
      })
      .sort(
        sort === "price"
          ? (a, b) => (a.best?.price ?? Infinity) - (b.best?.price ?? Infinity)
          : sort === "title"
            ? (a, b) => a.title.localeCompare(b.title, "fr")
            : (a, b) => b.discount - a.discount || (a.best?.price ?? Infinity) - (b.best?.price ?? Infinity),
      );
  }, [games, maxPrice, platform, promosOnly, query, sort, when]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (platform) params.set("platform", platform);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (promosOnly) params.set("promos", "1");
    if (when !== "all") params.set("when", when);
    router.replace(`/search${params.size ? `?${params}` : ""}`, { scroll: false });
  }, [maxPrice, platform, promosOnly, query, router, when]);

  function syncUrl(event) {
    event.preventDefault();
  }

  function reset() {
    setQuery("");
    setPlatform("");
    setMaxPrice("");
    setPromosOnly(false);
    setWhen("all");
    setSort("relevance");
    router.replace("/search", { scroll: false });
  }

  return (
    <section className="wrap search-page">
      <div className="page-heading">
        <p className="eyebrow">Explorer le catalogue</p>
        <h1>Recherche de jeux</h1>
        <p>Filtrez les {games.length} jeux disponibles dans la démo.</p>
      </div>
      <form className="search-controls panel" role="search" onSubmit={syncUrl}>
        <label className="field"><span className="field__label">Titre, studio ou genre</span><input className="field__input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex. Elden Ring" /></label>
        <label className="field"><span className="field__label">Plateforme</span><select className="field__input" value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">Toutes</option>{platforms.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span className="field__label">Prix maximum (€)</span><input className="field__input" type="number" min="0" step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Sans limite" /></label>
        <label className="check"><input type="checkbox" checked={promosOnly} onChange={(event) => { setPromosOnly(event.target.checked); }} /> Promotions uniquement</label>
        <label className="field"><span className="field__label">Disponibilité</span><select className="field__input" value={when} onChange={(event) => setWhen(event.target.value)}><option value="all">Tous</option><option value="released">Déjà sortis</option><option value="upcoming">À venir</option></select></label>
        <label className="field"><span className="field__label">Trier par</span><select className="field__input" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Pertinence</option><option value="price">Prix croissant</option><option value="title">Titre</option></select></label>
        <button className="btn btn--ghost btn--sm" type="button" onClick={reset}>Effacer les filtres</button>
      </form>
      <div className="results__bar"><p className="results__count">{results.length} résultat{results.length === 1 ? "" : "s"} <span>· catalogue de démonstration</span></p></div>
      <GameGrid games={results} emptyMessage="Aucun jeu ne correspond à ces filtres." />
    </section>
  );
}
