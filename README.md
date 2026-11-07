# PlayRadar

Tout l'univers d'un jeu vidéo (prix, studio, éditions, mises à jour) réuni au même endroit.
Projet Web Sup'Com 2026–2027 · Groupe 9 · Ahmed Mnasri & Yessine Rekik · Encadrante : Dr. Maroua Nouioua.

## Objectif 02 : conception, arborescence et prototypage

| Livrable | Où le trouver |
| --- | --- |
| Présentation (PDF à rendre) | [`livrables/Groupe9_Projet_Web_Objectif2.pdf`](livrables/Groupe9_Projet_Web_Objectif2.pdf) |
| Présentation animée (soutenance) | [`presentation/index.html`](presentation/index.html) |
| Prototype cliquable (HTML, CSS, JS) | [`prototype/index.html`](prototype/index.html) |

### Présentation animée

Ouvrir `presentation/index.html` dans Chrome, Edge ou Firefox (aucune installation, fonctionne hors ligne).

- `→`, `Espace` ou `Entrée` : avancer · `←` : reculer · `F` : plein écran · `1`–`9` : aller à une diapositive
- Diapositive 06 : chaque appui sur `→` passe à la section suivante de la fiche jeu avant de changer de diapositive.
- Couverture et fin : scènes 3D (three.js) avec les vraies jaquettes. Diapositive 10 : flux de données animé sur canvas. Mieux vaut un navigateur récent avec WebGL ; sans WebGL, le reste fonctionne.

### Prototype

Ouvrir `prototype/index.html`. Quatre pages sont prototypées : Accueil, Recherche, Fiche jeu, Ma liste.

- Touche `W` ou bouton en bas à gauche : bascule **wireframe noir et blanc / haute fidélité** (même code).
- Touche `/` : recherche instantanée. Bouton `€ / DT` : affichage des prix en euros ou en dinars.
- Les liens vers les pages non prototypées (Sorties, Connexion, Guide…) affichent un message.
- **Vraies données Steam** (relevées le 7 nov. 2026 sur l'API publique) pour 14 jeux, dont GTA V : titres, studios, dates, PEGI, descriptions, éditions, configuration, actualités, jaquettes et images de fond officielles, prix Steam. Les prix des autres boutiques et les historiques sont simulés pour la maquette.
- La liste de souhaits est gardée dans le navigateur (localStorage).

```
prototype/
  index.html · recherche.html · jeu.html · liste.html
  assets/css/tokens.css   charte graphique (couleurs, typos, espacements, mode wireframe)
  assets/css/app.css      composants et pages
  assets/js/steam-data.js données réelles relevées sur l'API Steam (généré)
  assets/js/data.js       fusion Steam + couche maquette (forme du futur schéma PostgreSQL)
  assets/games/<jeu>/     jaquette, image de fond et bannière officielles (Steam)
  assets/js/components.js en-tête, carte de jeu, alertes, recherche… (futurs composants React)
  assets/js/chart.js      historique des prix (futur Recharts)
  assets/js/covers.js     jaquettes (officielles, ou génératives en secours)
  assets/js/pages/*.js    logique de chaque page
```

### Regénérer les captures et le PDF

```bash
cd tools
npm install
npx playwright install chromium
npm run games   # relève les données et visuels Steam → prototype/assets
npm run shots   # captures du prototype → presentation/assets/img
npm run pdf     # → livrables/Groupe9_Projet_Web_Objectif2.pdf
```

Polices (licence OFL) : Space Grotesk, DM Sans, JetBrains Mono. Icônes : Lucide (ISC). Animations : GSAP. 3D : three.js r149 (MIT).
Jaquettes et visuels des jeux © leurs éditeurs respectifs, utilisés à titre d'illustration dans un projet étudiant non commercial.
