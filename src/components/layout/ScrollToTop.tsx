/**
 * NOTE: starts each new page at the top.
 * Why it exists: PRD P0.1. A single-page app never reloads, so the browser keeps the old scroll position.
 * Without this, opening a product from the bottom of the catalog would land you at the bottom of its page.
 * Connects to: `Layout.tsx`. It draws nothing and only runs this effect.
 */
import { useEffect } from "react";
import { useLocation } from "react-router";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  // Runs whenever the path changes. It watches `pathname` and not the whole URL, so changing a filter
  // in the query string doesn't throw you back to the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
