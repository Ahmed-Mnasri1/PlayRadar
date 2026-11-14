"use client";

import Link from "next/link";
import { formatPrice } from "../../lib/format";
import { usePlayRadar } from "../providers";

export function WishlistExperience({ games }) {
  const { wishlist, currency, ready, updateWishlistItem, removeFromWishlist } = usePlayRadar();
  const items = wishlist
    .map((item) => ({ item, game: games.find((game) => game.id === item.id) }))
    .filter(({ game }) => game);

  if (!ready) return <section className="wrap wishlist-page"><p role="status">Chargement de votre liste…</p></section>;

  return (
    <section className="wrap wishlist-page">
      <div className="page-heading">
        <p className="eyebrow">Votre espace</p>
        <h1>Ma liste</h1>
        <p>{items.length} jeu{items.length === 1 ? "" : "x"} suivi{items.length === 1 ? "" : "s"} sur cet appareil.</p>
      </div>
      <p className="notice" role="note">Les alertes sont enregistrées localement pour la démo : aucun e-mail n’est envoyé.</p>
      {!items.length ? (
        <div className="empty wishlist-empty"><h2>Votre liste est vide</h2><p>Ajoutez un jeu depuis sa fiche ou une carte du catalogue.</p><Link className="btn btn--primary" href="/search">Explorer les jeux</Link></div>
      ) : (
        <div className="wishlist-list">
          {items.map(({ item, game }) => (
            <article className="wish-row" key={game.id}>
              <Link className="cover wish-row__cover" href={`/games/${game.id}`}><img className="cover__img" src={`/${game.img.cover}`} alt={`Jaquette de ${game.title}`} /></Link>
              <div className="wish-row__title"><Link href={`/games/${game.id}`}><h2>{game.title}</h2></Link><small>{game.platforms.join(" · ")}</small></div>
              <div className="wish-row__price"><span>{formatPrice(game.best?.price, currency)}</span><small>{game.best ? "Meilleure offre du catalogue" : "Aucune offre pour le moment"}</small></div>
              <label className="field wish-target"><span className="field__label">Prix cible (€)</span><input className="field__input" type="number" min="0" step="0.5" value={item.target ?? ""} placeholder="Aucun" onChange={(event) => updateWishlistItem(game.id, { target: event.target.value === "" ? null : Number(event.target.value) })} /></label>
              <label className="check wish-alert"><input type="checkbox" checked={item.alert} onChange={(event) => updateWishlistItem(game.id, { alert: event.target.checked })} /> Alerte locale</label>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => removeFromWishlist(game.id)}>Retirer</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
