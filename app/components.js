"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatPrice } from "../lib/format";
import { usePlayRadar } from "./providers";

const stores = {
  steam: "Steam",
  epic: "Epic Games",
  gog: "GOG",
  rockstar: "Rockstar Store",
  psn: "PlayStation Store",
  xbox: "Xbox Store",
  nintendo: "Nintendo eShop",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currency, setCurrency, wishlist } = usePlayRadar();

  function submitSearch(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q")?.toString().trim() ?? "";
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <header className="header">
      <div className="header__in wrap">
        <Link className="logo" href="/" aria-label="PlayRadar, accueil">
          <span className="logo__mark" aria-hidden="true">◉</span>
          <span className="logo__word">Play<b>Radar</b></span>
        </Link>
        <form className="search header-search" role="search" onSubmit={submitSearch}>
          <label className="visually-hidden" htmlFor="header-search">Rechercher un jeu</label>
          <input className="search__input" id="header-search" name="q" type="search" placeholder="Rechercher un jeu…" />
          <button className="search-submit" type="submit" aria-label="Lancer la recherche">⌕</button>
        </form>
        <nav className="nav" aria-label="Navigation principale">
          <Link className="nav__link" aria-current={pathname === "/search" ? "page" : undefined} href="/search">Jeux</Link>
          <Link className="nav__link" aria-current={pathname === "/wishlist" ? "page" : undefined} href="/wishlist">
            Ma liste <span className="nav__count">{wishlist.length}</span>
          </Link>
        </nav>
        <div className="cur" aria-label="Devise d’affichage">
          <button type="button" aria-pressed={currency === "EUR"} onClick={() => setCurrency("EUR")}>€</button>
          <button type="button" aria-pressed={currency === "TND"} onClick={() => setCurrency("TND")}>DT</button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__in wrap">
        <div className="footer__brand">
          <Link className="logo" href="/"><span className="logo__word">Play<b>Radar</b></span></Link>
          <p>Comparez les prix, suivez vos jeux et décidez au bon moment. Maquette pédagogique : les offres hors Steam sont simulées.</p>
        </div>
        <div className="footer__cols">
          <div><h3>Explorer</h3><Link href="/">Accueil</Link><Link href="/search">Tous les jeux</Link></div>
          <div><h3>Votre espace</h3><Link href="/wishlist">Ma liste</Link><Link href="/search?promos=1">Promotions</Link></div>
          <div><h3>À propos</h3><a href="https://store.steampowered.com/" target="_blank" rel="noreferrer">Données Steam ↗</a></div>
        </div>
      </div>
      <div className="footer__legal wrap"><span>© PlayRadar · Projet étudiant</span><span>Prix convertis à titre indicatif : 1 € ≈ 3,4 DT</span></div>
    </footer>
  );
}

export function GameCard({ game }) {
  const { currency, isWishlisted, toggleWishlist } = usePlayRadar();
  const cover = game.img?.cover ? `/${game.img.cover}` : "";
  const best = game.best;

  return (
    <article className="gcard">
      <Link className="gcard__link" href={`/games/${game.id}`}>
        <div className="cover gcard__cover">
          {cover ? <img className="cover__img" src={cover} alt={`Jaquette de ${game.title}`} loading="lazy" /> : <span className="cover-placeholder">{game.title}</span>}
          <div className="gcard__badges">
            {game.upcoming && <span className="badge badge--sky">À venir</span>}
            {!game.upcoming && game.discount > 0 && <span className="badge badge--signal">−{game.discount} %</span>}
          </div>
        </div>
        <div className="gcard__body">
          <div className="gcard__meta"><span>{game.studio}</span><span className="gcard__plat">{game.platforms.slice(0, 2).join(" · ")}</span></div>
          <h3 className="gcard__title">{game.title}</h3>
          <div className="gcard__price"><span className="price">{best ? formatPrice(best.price, currency) : "Prix à venir"}</span></div>
          <div className="gcard__foot"><span className="gcard__store">{best ? stores[best.store] ?? best.store : "Sortie à venir"}</span></div>
        </div>
      </Link>
      <button
        className={`wishlist-chip ${isWishlisted(game.id) ? "is-saved" : ""}`}
        type="button"
        aria-label={isWishlisted(game.id) ? `Retirer ${game.title} de ma liste` : `Ajouter ${game.title} à ma liste`}
        aria-pressed={isWishlisted(game.id)}
        onClick={() => toggleWishlist(game.id)}
      >
        {isWishlisted(game.id) ? "♥" : "♡"}
      </button>
    </article>
  );
}

export function GameGrid({ games, emptyMessage = "Aucun jeu à afficher." }) {
  if (!games.length) return <div className="empty"><h3>{emptyMessage}</h3><p>Essayez d’élargir votre recherche.</p></div>;
  return <div className="grid-cards">{games.map((game) => <GameCard game={game} key={game.id} />)}</div>;
}

export function WishlistButton({ gameId }) {
  const { isWishlisted, toggleWishlist } = usePlayRadar();
  const saved = isWishlisted(gameId);

  return (
    <button className={`btn ${saved ? "btn--primary" : "btn--ghost"}`} type="button" aria-pressed={saved} onClick={() => toggleWishlist(gameId)}>
      {saved ? "♥ Dans ma liste" : "♡ Ajouter à ma liste"}
    </button>
  );
}

export function CurrentPrice({ price }) {
  const { currency } = usePlayRadar();
  return <>{formatPrice(price, currency)}</>;
}

export function OfferTable({ game, offers }) {
  const { currency } = usePlayRadar();
  const names = {
    steam: "Steam",
    epic: "Epic Games",
    gog: "GOG",
    rockstar: "Rockstar Store",
    psn: "PlayStation Store",
    xbox: "Xbox Store",
    nintendo: "Nintendo eShop",
  };

  if (!offers.length) return <p>Aucune offre publiée pour le moment.</p>;

  return (
    <div className="table-scroll">
      <table className="ptable">
        <thead><tr><th>Boutique</th><th>Plateforme</th><th className="num">Prix</th><th className="num">Remise</th><th>Source</th></tr></thead>
        <tbody>
          {offers.map((offer, index) => {
            const discount = offer.base ? Math.round((1 - offer.price / offer.base) * 100) : 0;
            return (
              <tr className={index === 0 ? "is-best" : ""} key={`${offer.store}-${offer.edition}`}>
                <td>{names[offer.store] ?? offer.store}{index === 0 && <span className="best-tag">Meilleur prix</span>}</td>
                <td>{game.platforms.join(", ")}</td>
                <td className="num price">{formatPrice(offer.price, currency)}</td>
                <td className="num">{discount ? `−${discount} %` : "—"}</td>
                <td>{offer.real ? "Steam (relevé)" : "Simulation"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
