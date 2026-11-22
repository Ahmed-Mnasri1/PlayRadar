import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, storage, usd } from "../lib.js";
import { AppContext } from "./AppContext.js";

const DEFAULT_PREFS = { drops: true, releases: true };
const releaseState = (g) => (!g.upcoming ? "out" : g.official ? "preorder" : "announced");

export function AppProvider({ children }) {
  const [meta, setMeta] = useState(null);
  const [region, setRegionState] = useState(() => storage.get("region", "us"));
  // Summaries of the games in "My list" only: pages fetch the rest of the catalog themselves.
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0); // bumped on every live price change
  const [live, setLive] = useState({ connected: false, status: null });
  const [toastState, setToast] = useState(null);
  // My list lives on the server; the local copy only makes the first paint instant.
  const [wishlist, setWishlistState] = useState(() => storage.get("wishlist-cache", []));
  const [prefs, setPrefsState] = useState(DEFAULT_PREFS);
  const [listReady, setListReady] = useState(false);
  const regionRef = useRef(region);
  const lastToast = useRef(0);
  const hitIds = useRef(null);
  const releases = useRef(null);

  const setRegion = useCallback((r) => {
    regionRef.current = r;
    setRegionState(r);
    storage.set("region", r);
  }, []);
  const setWishlist = useCallback((next) => {
    setWishlistState(next);
    storage.set("wishlist-cache", next);
  }, []);

  /** Toast: `msg` is a string or JSX. */
  const toast = useCallback((msg, icon = "check") => setToast({ msg, icon, key: Date.now() }), []);
  useEffect(() => {
    if (!toastState) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toastState]);

  /* ------------------------------------------------ my list (server) */
  const loadList = useCallback(
    () =>
      api("/wishlist")
        .then((d) => {
          setWishlist(d.items);
          setPrefsState(d.prefs);
          setListReady(true);
        })
        .catch(() => setListReady(true)), // offline: keep the cached copy
    [setWishlist]
  );
  useEffect(() => {
    loadList();
  }, [loadList]);

  const listRef = useRef(wishlist);
  listRef.current = wishlist;

  /** Optimistic update: change the UI now, then sync; on failure re-read the server's truth. */
  const mutate = useCallback(
    async (next, request) => {
      setWishlist(next);
      try {
        await request();
        return true;
      } catch (e) {
        toast(e.message || "Could not save your list", "info");
        loadList();
        return false;
      }
    },
    [setWishlist, toast, loadList]
  );

  /** Adds the game, or updates it if it is already in the list. */
  const saveItem = useCallback(
    (id, patch = {}) => {
      const cur = listRef.current;
      if (cur.some((w) => w.id === id))
        return mutate(
          cur.map((w) => (w.id === id ? { ...w, ...patch } : w)),
          () => api(`/wishlist/${id}`, { method: "PATCH", body: patch })
        );
      const item = { id, target: null, alert: false, added: new Date().toLocaleDateString("en-CA"), ...patch };
      return mutate([item, ...cur], () => api("/wishlist", { method: "POST", body: { id, ...patch } }));
    },
    [mutate]
  );
  const removeItem = useCallback(
    (id) =>
      mutate(
        listRef.current.filter((w) => w.id !== id),
        () => api(`/wishlist/${id}`, { method: "DELETE" })
      ),
    [mutate]
  );
  const setPrefs = useCallback(
    (next) => {
      const prev = prefs;
      setPrefsState(next);
      api("/wishlist/prefs", { method: "PUT", body: next }).catch((e) => {
        setPrefsState(prev);
        toast(e.message, "info");
      });
    },
    [prefs, toast]
  );

  /* ---------------------------------------------------- reference data */
  useEffect(() => {
    api("/meta")
      .then((m) => {
        setMeta(m);
        setLive((l) => ({ ...l, status: m.status }));
      })
      .catch((e) => setError(e.message));
  }, []);

  /* my list's games for the selected region (alerts + list page); reloaded after live changes */
  const listIds = wishlist.map((w) => w.id).join(",");
  useEffect(() => {
    let off = false;
    if (!listIds) {
      setGames([]);
      return;
    }
    api(`/games?region=${region}&ids=${encodeURIComponent(listIds)}`)
      .then((d) => !off && (setGames(d.games), setError(null)))
      .catch((e) => !off && setError(e.message));
    return () => {
      off = true;
    };
  }, [region, version, listIds]);

  /* live updates: Server-Sent Events, with a polling safety net */
  useEffect(() => {
    let es = null;
    // One Steam refresh can announce dozens of changes in a row: reload the games once per burst.
    let bumpTimer = null;
    const bump = () => {
      clearTimeout(bumpTimer);
      bumpTimer = setTimeout(() => setVersion((v) => v + 1), 1200);
    };
    const close = () => {
      es && es.close();
      es = null;
    };
    const open = () => {
      try {
        es = new EventSource("/api/events");
      } catch {
        return; /* unsupported: polling below still works */
      }
      es.onopen = () => setLive((l) => ({ ...l, connected: true }));
      es.onerror = () => setLive((l) => ({ ...l, connected: false }));
      es.addEventListener("status", (e) => setLive((l) => ({ ...l, status: JSON.parse(e.data) })));
      es.addEventListener("price", (e) => {
        const c = JSON.parse(e.data);
        bump();
        const now = Date.now();
        if (now - lastToast.current > 2500 && (c.kind === "key" || c.region === regionRef.current)) {
          lastToast.current = now;
          setToast({
            msg: (
              <>
                <b>{c.title}</b> · {c.storeName}: {usd(c.from)} → <b>{usd(c.to)}</b>
              </>
            ),
            icon: c.to < c.from ? "trending-down" : "trending-up",
            key: now,
          });
        }
      });
    };
    // A page kept in the back/forward cache would keep its stream open and hold one of
    // the browser's 6 connections per host; after a few navigations the site would hang.
    const onHide = () => close();
    const onShow = (e) => {
      if (e.persisted && !es) {
        open();
        setVersion((v) => v + 1); // prices may have changed while the page was cached
      }
    };
    open();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    const poll = setInterval(() => setVersion((v) => v + 1), 60_000);
    return () => {
      close();
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
      clearInterval(poll);
      clearTimeout(bumpTimer);
    };
  }, []);

  /* in-page alerts: price under target (if enabled) and release news (if enabled) */
  useEffect(() => {
    if (!games || !listReady) return;
    const byId = new Map(games.map((g) => [g.id, g]));
    const hits = new Set(
      wishlist
        .filter((w) => {
          const g = byId.get(w.id);
          return w.alert && w.target != null && g && !g.upcoming && g.official && g.official.price <= w.target;
        })
        .map((w) => w.id)
    );
    const rel = new Map(wishlist.filter((w) => byId.has(w.id)).map((w) => [w.id, releaseState(byId.get(w.id))]));

    if (prefs.drops && hitIds.current)
      for (const id of hits)
        if (!hitIds.current.has(id)) {
          const g = byId.get(id);
          const w = wishlist.find((x) => x.id === id);
          toast(
            <>
              Price alert: <b>{g.title}</b> is now {usd(g.official.price)}, under your target of {usd(w.target)}
            </>,
            "bell-ring"
          );
        }
    if (prefs.releases && releases.current)
      for (const [id, st] of rel) {
        const was = releases.current.get(id);
        if (was && was !== st)
          toast(
            <>
              <b>{byId.get(id).title}</b> {st === "out" ? "is out now" : "is open for pre-order"}
            </>,
            "calendar-clock"
          );
      }
    hitIds.current = hits;
    releases.current = rel;
  }, [games, wishlist, listReady, prefs, toast]);

  const value = useMemo(
    () => ({
      meta,
      region,
      setRegion,
      games,
      error,
      version,
      live,
      toast,
      toastState,
      wishlist,
      listReady,
      saveItem,
      removeItem,
      prefs,
      setPrefs,
      game: (id) => (games || []).find((g) => g.id === id),
    }),
    [meta, region, setRegion, games, error, version, live, toastState, wishlist, listReady, toast, saveItem, removeItem, prefs, setPrefs]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
