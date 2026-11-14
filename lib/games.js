import gameData from "../data/games.json" with { type: "json" };

export const games = gameData;

export function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function findGame(id) {
  return games.find((game) => game.id === id) ?? null;
}

export function searchGames({
  q = "",
  platform = "",
  genre = "",
  maxPrice = "",
  promosOnly = false,
  sort = "relevance",
} = {}) {
  const query = normalize(q);
  const ceiling = maxPrice === "" ? Infinity : Number(maxPrice);
  const results = games.filter((game) => {
    const searchable = normalize(
      [game.title, game.aliases, game.studio, game.publisher, ...game.genres].join(" "),
    );

    return (
      (!query || searchable.includes(query)) &&
      (!platform || game.platforms.includes(platform)) &&
      (!genre || game.genres.includes(genre)) &&
      (!Number.isFinite(ceiling) || (game.best && game.best.price <= ceiling)) &&
      (!promosOnly || game.discount > 0)
    );
  });

  const sorters = {
    relevance: (a, b) => b.discount - a.discount || (a.best?.price ?? Infinity) - (b.best?.price ?? Infinity),
    price: (a, b) => (a.best?.price ?? Infinity) - (b.best?.price ?? Infinity),
    discount: (a, b) => b.discount - a.discount,
    title: (a, b) => a.title.localeCompare(b.title, "fr"),
  };

  return results.sort(sorters[sort] ?? sorters.relevance);
}
