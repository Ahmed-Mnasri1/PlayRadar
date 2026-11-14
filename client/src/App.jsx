import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Header, Footer, TabBar, Toast } from "./components/ui.jsx";
import { useApp } from "./context.jsx";
import Home from "./pages/Home.jsx";
import Browse from "./pages/Browse.jsx";
import Game from "./pages/Game.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import Changes from "./pages/Changes.jsx";
import Contact from "./pages/Contact.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  const { pathname, hash } = useLocation();
  const { error, games } = useApp();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    else setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50);
  }, [pathname, hash]);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      {error && !games && <div className="wrap"><p className="banner-err">Cannot reach the PlayRadar API ({error}). Start the server with <code>npm run dev</code>.</p></div>}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/game/:id" element={<Game />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/changes" element={<Changes />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <TabBar />
      <Toast />
    </>
  );
}
