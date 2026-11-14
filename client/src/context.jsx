import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, storage, usd } from "./lib.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const DEFAULT_LIST = [
  { id: "no-mans-sky", target: 25, alert: true, added: "2026-09-02" },
  { id: "cyberpunk-2077", target: 30, alert: true, added: "2026-08-14" },
  { id: "gta-v", target: 15, alert: true, added: "2026-10-01" },
  { id: "fable", target: null, alert: true, added: "2026-10-25" },
];

export function AppProvider({ children }) {
  const [meta, setMeta] = useState(null);
  const [region, setRegionState] = useState(() => storage.get("region", "us"));
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0); // bumped on every live price change
  const [live, setLive] = useState({ connected: false, status: null });
  const [toastState, setToast] = useState(null);
  const [wishlist, setWishlistState] = useState(() => storage.get("wishlist", DEFAULT_LIST));
  const lastToast = useRef(0);
  const hitIds = useRef(null);

  const setRegion = (r) => {
    setRegionState(r);
    storage.set("region", r);
  };
  const setWishlist = useCallback((fn) => {
    setWishlistState((cur) => {
      const next = typeof fn === "function" ? fn(cur) : fn;
      storage.set("wishlist", next);
      return next;
    });
  }, []);

  const toast = useCallback((msg, icon = "check") => setToast({ msg, icon, key: Date.now() }), []);
  useEffect(() => {
    if (!toastState) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toastState]);

  /* reference data */
  useEffect(() => {
    api("/meta").then((m) => {
      setMeta(m);
      setLive((l) => ({ ...l, status: m.status }));
    }).catch((e) => setError(e.message));
  }, []);

  /* games for the selected region; reloaded after every live change */
  useEffect(() => {
    let off = false;
    api(`/games?region=${region}`)
      .then((d) => !off && (setGames(d.games), setError(null)))
      .catch((e) => !off && setError(e.message));
    return () => {
      off = true;
    };
  }, [region, version]);

  /* live updates: Server-Sent Events, with a polling safety net */
  useEffect(() => {
    let es;
    try {
      es = new EventSource("/api/events");
    } catch {
      /* unsupported: polling below still works */
    }
    if (es) {
      es.onopen = () => setLive((l) => ({ ...l, connected: true }));
      es.onerror = () => setLive((l) => ({ ...l, connected: false }));
      es.addEventListener("status", (e) => setLive((l) => ({ ...l, status: JSON.parse(e.data) })));
      es.addEventListener("price", (e) => {
        const c = JSON.parse(e.data);
        setVersion((v) => v + 1);
        const now = Date.now();
        if (now - lastToast.current > 2500 && (c.kind === "key" || c.region === JSON.parse(localStorage.getItem("pr-region") || '"us"'))) {
          lastToast.current = now;
          setToast({ msg: `<b>${c.title}</b> · ${c.storeName}: ${usd(c.from)} → <b>${usd(c.to)}</b>`, icon: c.to < c.from ? "trending-down" : "trending-up", key: now });
        }
      });
    }
    const poll = setInterval(() => setVersion((v) => v + 1), 60_000);
    return () => {
      es && es.close();
      clearInterval(poll);
    };
  }, []);

  /* wishlist alerts: toast when a game newly drops under its target */
  useEffect(() => {
    if (!games) return;
    const hits = new Set(wishlist.filter((w) => w.alert && w.target != null).filter((w) => {
      const g = games.find((x) => x.id === w.id);
      return g && !g.upcoming && g.official && g.official.price <= w.target;
    }).map((w) => w.id));
    if (hitIds.current) {
      for (const id of hits) if (!hitIds.current.has(id)) {
        const g = games.find((x) => x.id === id);
        const w = wishlist.find((x) => x.id === id);
        setToast({ msg: `Price alert: <b>${g.title}</b> is now ${usd(g.official.price)}, under your target of ${usd(w.target)}`, icon: "bell-ring", key: Date.now() });
      }
    }
    hitIds.current = hits;
  }, [games, wishlist]);

  const value = useMemo(
    () => ({ meta, region, setRegion, games, error, version, live, toast, toastState, wishlist, setWishlist, game: (id) => (games || []).find((g) => g.id === id) }),
    [meta, region, games, error, version, live, toastState, wishlist, toast, setWishlist]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
