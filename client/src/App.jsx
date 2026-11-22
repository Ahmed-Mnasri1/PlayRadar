import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import TabBar from "./components/layout/TabBar.jsx";
import Toast from "./components/layout/Toast.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { PageSkeleton } from "./components/Skeleton.jsx";
import { useApp } from "./hooks/useApp.js";
import Home from "./pages/Home.jsx";

// Code splitting: the home page ships in the main bundle (it is the landing page),
// every other page is downloaded the first time it is visited.
const Browse = lazy(() => import("./pages/Browse.jsx"));
const Game = lazy(() => import("./pages/Game.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const Changes = lazy(() => import("./pages/Changes.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

export default function App() {
  const { pathname, hash } = useLocation();
  const { error, meta } = useApp();

  // New page → back to the top; "#anchor" links scroll to their section.
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    else setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50);
  }, [pathname, hash]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      {error && !meta && (
        <div className="wrap">
          <p className="banner-err" role="alert">
            Cannot reach the PlayRadar API ({error}). Start the server with <code>npm run dev</code>.
          </p>
        </div>
      )}
      <ErrorBoundary key={pathname}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/game/:id" element={<Game />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/changes" element={<Changes />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Footer />
      <TabBar />
      <Toast />
    </>
  );
}
