import { useEffect } from "react";

/** Sets the browser tab title; `null` leaves it unchanged (e.g. while loading). */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
