import { useCallback, useEffect, useState } from "react";
import { api } from "../lib.js";

/**
 * GET `path` from the API and re-fetch whenever `path` or `refresh` changes.
 * While a live refresh runs, the previous data stays on screen (no flicker);
 * when `path` itself changes, `data` goes back to null so the page shows a skeleton.
 * Pass a falsy `path` to skip the request.
 * `{ keep: true }`: also keep the previous data while a *new* path loads (paging, filters).
 */
export function useApi(path, refresh, { keep = false } = {}) {
  const [state, setState] = useState({ path: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!path) return;
    let off = false;
    api(path)
      .then((data) => !off && setState({ path, data, error: null }))
      .catch((error) => !off && setState((s) => ({ path, data: s.path === path ? s.data : null, error })));
    return () => {
      off = true;
    };
  }, [path, refresh, attempt]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, path: null }));
    setAttempt((n) => n + 1);
  }, []);

  const fresh = state.path === path;
  return { data: fresh || keep ? state.data : null, error: fresh ? state.error : null, loading: !fresh, reload };
}
