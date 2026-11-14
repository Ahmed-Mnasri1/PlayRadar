import { AppProviders } from "./providers";
import { Footer, Header } from "./components";

export const metadata = {
  title: "PlayRadar — Le bon jeu, au bon prix",
  description: "Comparez les prix des jeux vidéo, consultez les offres et gardez vos jeux favoris.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="stylesheet" href="/assets/css/tokens.css" />
        <link rel="stylesheet" href="/assets/css/app.css" />
        <link rel="stylesheet" href="/assets/css/phase3.css" />
      </head>
      <body>
        <a className="skip" href="#main">Aller au contenu</a>
        <AppProviders>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
