/**
 * NOTE: connects the catalog to the URL.
 * Why it exists: `CatalogPage` shouldn't need to know how the URL works. It reads `params` and calls `change`.
 * Connects to: `utils/url.ts` holds the rules, and React Router's `useSearchParams` reads and writes the URL.
 *
 * All changes go through this one function for a reason: two `setSearchParams` calls in the same tick don't
 * queue up, so the second would overwrite the first.
 */
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { nextSearchParams, parseCatalogParams, type CatalogChange, type CatalogParams } from "../utils/url";

export interface UseCatalogParamsResult {
  params: CatalogParams;
  change: (change: CatalogChange) => void;
}

export function useCatalogParams(): UseCatalogParamsResult {
  const [searchParams, setSearchParams] = useSearchParams();

  /** `useMemo` keeps the same object until the URL changes, so effects that depend on it don't re-run. */
  const params = useMemo(() => parseCatalogParams(searchParams), [searchParams]);

  const change = useCallback(
    (catalogChange: CatalogChange) => {
      // Each search keystroke replaces the history entry, so Back goes to the previous page and not to
      // every half-typed word. Other changes add an entry, so Back undoes them one at a time.
      setSearchParams((current) => nextSearchParams(current, catalogChange), { replace: catalogChange.type === "search" });
    },
    [setSearchParams],
  );

  return { params, change };
}
