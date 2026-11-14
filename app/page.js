import Link from "next/link";
import { GameGrid } from "./components";
import { games } from "../lib/games";

export default function HomePage() {
  const featured = games.find((game) => game.id === "gta-v") ?? games[0];
  const deals = [...games]
    .filter((game) => !game.upcoming && game.discount > 0 && game.id !== featured.id)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 4);
  const upcoming = games.filter((game) => game.upcoming).slice(0, 4);

  return (
    <>
      <section className="hero wrap">
        <div className="hero__copy">
          <p className="eyebrow">Comparateur de prix · jeux vidéo</p>
          <h1 className="hero__title"><span className="line">Le bon jeu,</span><span className="line">au bon prix,</span><span className="line"><mark>au bon moment.</mark></span></h1>
          <p className="hero__lead">Comparez les boutiques, consultez l’historique et gardez vos prochains achats sous la main.</p>
          <form className="hero-search" action="/search" role="search">
            <label className="visually-hidden" htmlFor="home-search">Quel jeu cherchez-vous ?</label>
            <input id="home-search" name="q" type="search" placeholder="Quel jeu cherchez-vous ?" />
            <button className="btn btn--primary btn--lg" type="submit">Comparer les prix</button>
          </form>
          <div className="hero__chips chips">
            <Link className="chip" href="/search?platform=PC">PC</Link>
            <Link className="chip" href="/search?platform=PS5">PS5</Link>
            <Link className="chip" href="/search?maxPrice=20">Moins de 20 €</Link>
            <Link className="chip" href="/search?promos=1">En promotion</Link>
          </div>
          <ul className="hero__facts">
            <li><b>{games.length}</b><span>jeux dans la démo</span></li>
            <li><b>4 pages</b><span>parcours complet</span></li>
            <li><b>Local</b><span>liste persistante</span></li>
          </ul>
        </div>
        <div className="radar-card">
          <div className="radar-card__rings" aria-hidden="true"><span /><span /><span /><i /></div>
          <p className="eyebrow">À la une</p>
          <img src={`/${featured.img.hero}`} alt="" />
          <div className="radar-card__copy">
            <h2>{featured.title}</h2>
            <p>{featured.tagline}</p>
            <Link className="btn btn--primary" href={`/games/${featured.id}`}>Voir les offres →</Link>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <div className="section__head">
          <div><h2>Bons plans du catalogue</h2><p>Offres de démonstration ; les prix hors Steam sont simulés.</p></div>
          <Link className="link-more" href="/search?promos=1">Toutes les offres →</Link>
        </div>
        <GameGrid games={deals} />
      </section>

      <section className="section wrap">
        <div className="section__head">
          <div><h2>À venir</h2><p>Découvrez les jeux annoncés dans le catalogue de démonstration.</p></div>
          <Link className="link-more" href="/search?when=upcoming">Tous les jeux →</Link>
        </div>
        <GameGrid games={upcoming} />
      </section>
    </>
  );
}
