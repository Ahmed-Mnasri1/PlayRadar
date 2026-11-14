"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatPrice } from "../lib/format";

const STORAGE_KEY = "playradar-phase3";
const AppContext = createContext(null);

export function AppProviders({ children }) {
  const [wishlist, setWishlist] = useState([]);
  const [currency, setCurrency] = useState("EUR");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (Array.isArray(saved.wishlist)) setWishlist(saved.wishlist);
      if (saved.currency === "EUR" || saved.currency === "TND") setCurrency(saved.currency);
    } catch (error) {
      console.error("Could not read the saved PlayRadar preferences.", error);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ wishlist, currency }));
    } catch (error) {
      console.error("Could not save the PlayRadar preferences.", error);
    }
  }, [currency, ready, wishlist]);

  const toggleWishlist = useCallback((gameId) => {
    setWishlist((current) =>
      current.some((item) => item.id === gameId)
        ? current.filter((item) => item.id !== gameId)
        : [...current, { id: gameId, target: null, alert: false, added: new Date().toISOString() }],
    );
  }, []);

  const updateWishlistItem = useCallback((gameId, patch) => {
    setWishlist((current) =>
      current.map((item) => (item.id === gameId ? { ...item, ...patch } : item)),
    );
  }, []);

  const removeFromWishlist = useCallback((gameId) => {
    setWishlist((current) => current.filter((item) => item.id !== gameId));
  }, []);

  const value = useMemo(
    () => ({
      wishlist,
      currency,
      ready,
      setCurrency,
      toggleWishlist,
      updateWishlistItem,
      removeFromWishlist,
      isWishlisted: (gameId) => wishlist.some((item) => item.id === gameId),
    }),
    [currency, ready, removeFromWishlist, toggleWishlist, updateWishlistItem, wishlist],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function usePlayRadar() {
  const context = useContext(AppContext);
  if (!context) throw new Error("usePlayRadar must be used inside AppProviders.");
  return context;
}
