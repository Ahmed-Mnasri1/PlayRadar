# 🎮 PlayRadar

> **Le bon jeu, au bon prix, au bon moment.**
> Un comparateur de jeux vidéo conçu pour aider les joueurs à comparer les offres, comprendre les prix et garder les jeux qu’ils souhaitent suivre.

**Projet Web · Groupe 9 · Sup’Com** · Application de démonstration réalisée avec **Next.js / React**.

| Découvrir | Lien |
|---|---|
| 📖 Présentation détaillée du projet, des fonctionnalités et de la feuille de route | [description.md](description.md) |
| 📦 Archive de l’application — Objectif 03 | [Groupe9_Projet_Web_Objectif3.zip](livrables/Groupe9_Projet_Web_Objectif3.zip) |
| 🧾 Rapport d’avancement et checklist de l’Objectif 03 | [PHASE-3-REPORT.md](PHASE-3-REPORT.md) |

## 🚀 Lancer l’application

Prérequis : **Node.js 20.9+** et npm. Depuis la racine du dépôt :

```bash
npm install
npm run dev
```

Ouvrir l’adresse affichée par Next.js, généralement **http://localhost:3000**. Garder le terminal ouvert pendant la visite : l’application dépend du serveur de développement. Les pages du projet Objectif 03 ne se lancent pas en ouvrant un fichier HTML directement.

### Parcours de démonstration

1. Depuis **Accueil**, rechercher un jeu ou choisir **Jeux**.
2. Dans **Recherche**, tester le texte, la plateforme, le prix maximum, les promotions et le tri.
3. Ouvrir une fiche, par exemple **Red Dead Redemption 2**, et consulter les offres, éditions et informations.
4. Ajouter le jeu à **Ma liste**, puis modifier sa cible de prix ou son alerte locale.
5. Utiliser **€ / DT** dans l’en-tête pour changer la devise d’affichage.

## ✨ Fonctionnalités actuelles

| Parcours | Ce que l’on peut faire |
|---|---|
| 🏠 Accueil — `/` | Découvrir les jeux mis en avant, les offres du catalogue, les sorties à venir et lancer une recherche. |
| 🔎 Recherche — `/search` | Rechercher par nom/studio, filtrer par plateforme, prix, promotions et disponibilité, puis trier les résultats. |
| 🎮 Fiche jeu — `/games/<id>` | Consulter les informations du jeu, comparer les offres, voir les éditions et consulter un historique de démonstration. |
| ❤️ Ma liste — `/wishlist` | Ajouter ou retirer des jeux, définir une cible de prix et activer/désactiver une alerte locale. L’état est gardé dans le navigateur. |
| 🔌 API de démonstration | `GET /api/games` pour le catalogue et `GET /api/games/:id` pour une fiche. |

## 🧪 Vérifier le projet

```bash
npm test
npm run build
npm run start
```

`npm run start` lance la version de production : exécuter d’abord `npm run build`.

## 🗂️ Les autres livrables

Les éléments de conception et de prototypage de l’Objectif 02 sont conservés :

- Présentation PDF : [Groupe9_Projet_Web_Objectif2.pdf](livrables/Groupe9_Projet_Web_Objectif2.pdf)
- Présentation animée : [presentation/index.html](presentation/index.html) — navigation au clavier : `←` / `→`, `Espace`, `Entrée`, `F` pour le plein écran.
- Prototype HTML indépendant : [prototype/index.html](prototype/index.html) — touche `W` pour basculer wireframe / haute fidélité.

## 🧰 Données et outils

- La fixture `data/games.json` contient **14 jeux** et est régénérable avec `npm run data:export`.
- Les informations Steam sont un relevé daté du **7 novembre 2026**. Les autres boutiques, une partie des prix et les historiques sont simulés pour la démonstration.
- Le taux EUR/DT est indicatif (**1 € ≈ 3,4 DT**). Les alertes ne déclenchent pas d’e-mail ; la liste n’est pas synchronisée entre appareils.
- Pour régénérer les données et les livrables de présentation, utiliser les outils de `tools/` :

```bash
cd tools
npm install
npx playwright install chromium
npm run games
npm run shots
npm run pdf
```

Pour les détails du produit, les limites de la démo et les fonctionnalités envisagées, consulter **[la description complète](description.md)**.
