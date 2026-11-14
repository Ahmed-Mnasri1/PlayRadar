import { notFound } from "next/navigation";
import Link from "next/link";
import { CurrentPrice, OfferTable, WishlistButton } from "../../components";
import { findGame, games } from "../../../lib/games";
import { formatPrice } from "../../../lib/format";

export function generateStaticParams() {
  return games.map((game) => ({ id: game.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const game = findGame(id);
  return { title: game ? `${game.title} — PlayRadar` : "Jeu introuvable — PlayRadar" };
}

export default async function GamePage({ params }) {
  const { id } = await params;
  const game = findGame(id);
  if (!game) notFound();

  const standardOffers = game.offers.filter((offer) => offer.edition === "standard").sort((a, b) => a.price - b.price);
  const cover = game.img?.cover ? `/${game.img.cover}` : "";
  const hero = game.img?.hero ? `/${game.img.hero}` : cover;

  return (
    <>
      <section className="game-hero has-art">
        <div className="game-hero__art" aria-hidden="true"><img src={hero} alt="" /></div>
        <div className="wrap game-hero__in">
          <nav className="crumbs" aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span>›</span><Link href="/search">Jeux</Link><span>›</span><span>{game.title}</span></nav>
          <div className="game-hero__grid">
            <div className="cover game-hero__cover">{cover && <img className="cover__img" src={cover} alt={`Jaquette de ${game.title}`} />}</div>
            <div className="game-hero__info">
              <div className="game-hero__tags">{game.platforms.map((platform) => <span className="plat" key={platform}>{platform}</span>)}{game.pegi && <span className={`pegi pegi--${game.pegi}`}>PEGI {game.pegi}</span>}</div>
              <h1>{game.title}<small>{game.studio}</small></h1>
              <p className="game-hero__meta">{game.genres.join(" · ")} · {game.upcoming ? `Sortie ${game.releaseText}` : `Sorti le ${game.releaseText}`}</p>
              <p className="game-hero__tagline">{game.tagline}</p>
              <div className="game-hero__actions"><WishlistButton gameId={game.id} /></div>
            </div>
            <aside className="decide">
              <div className="decide__label"><span>{game.upcoming ? "À venir" : "Meilleur prix du catalogue"}</span>{game.discount > 0 && <span className="badge badge--signal">−{game.discount} %</span>}</div>
              <div className="decide__price"><span className="price"><CurrentPrice price={game.best?.price} /></span></div>
              <p className="decide__why">{game.best ? `Meilleure offre affichée chez ${game.best.store}. Les offres hors Steam et l’historique sont simulés.` : "Aucune offre disponible dans le jeu de données."}</p>
              <Link className="btn btn--primary" href="#offers">Comparer les offres</Link>
            </aside>
          </div>
        </div>
      </section>
      <div className="wrap game-body">
        <div className="game-main">
          <section className="panel" id="offers">
            <div className="panel__head"><div><h2>Comparer les prix</h2><p className="panel__sub">Offres standard du catalogue de démonstration</p></div></div>
            <OfferTable game={game} offers={standardOffers} />
            <p className="data-note">Prix Steam : relevé le 7 novembre 2026. Les autres prix et les historiques sont simulés pour la maquette. La conversion en DT est indicative.</p>
          </section>
          {game.history?.length > 0 && (
            <section className="panel" id="history">
              <div className="panel__head"><div><h2>Historique des prix</h2><p className="panel__sub">Historique de démonstration, non connecté à un relevé continu.</p></div></div>
              <div className="price-history" role="img" aria-label="Historique de prix simulé">
                {game.history.slice(-12).map((point, index) => <span key={`${point.from}-${index}`} style={{ height: `${Math.max(14, (point.price / (game.base || 1)) * 100)}%` }} title={`${formatPrice(point.price)} · ${new Date(point.from).toLocaleDateString("fr-FR")}`} />)}
              </div>
              <p className="data-note">Plus bas historique simulé : {formatPrice(game.low?.price)}.</p>
            </section>
          )}
          {game.description && <section className="panel"><div className="panel__head"><div><h2>À propos du jeu</h2><p className="panel__sub">Description issue de la fiche Steam.</p></div></div><p className="about">{game.description}</p></section>}
        </div>
        <aside className="game-side">
          <section className="side-card"><h2>Infos clés</h2><dl className="facts"><dt>Développeur</dt><dd>{game.studio}</dd><dt>Éditeur</dt><dd>{game.publisher}</dd><dt>Sortie</dt><dd>{game.releaseText}</dd><dt>Genres</dt><dd>{game.genres.join(", ") || "Non précisé"}</dd></dl></section>
          {game.editions?.length > 0 && <section className="side-card"><h2>Éditions</h2><ul className="edition-list">{game.editions.map((edition) => <li key={edition.name}><b>{edition.name}</b>{edition.price != null && <span>{formatPrice(edition.price)}</span>}</li>)}</ul></section>}
        </aside>
      </div>
    </>
  );
}
