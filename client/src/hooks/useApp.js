import { useContext } from "react";
import { AppContext } from "../context/AppContext.js";

/** Access the global app state provided by <AppProvider>. */
export const useApp = () => useContext(AppContext);
