import { createContext } from "react";

/** Global app state (region, games, live status, my list, toasts) — filled by AppProvider. */
export const AppContext = createContext(null);
