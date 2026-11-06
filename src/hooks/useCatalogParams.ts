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
import { nextSearchParams, parseCatalogParams, type CatalogChange, type CatalogParams } from "@/utils/url";

export interface UseCatalogParamsResult {
  params: CatalogParams;
  change: (change: CatalogChange) => void;
}

/** Reads the filters from the URL and changes them through one function, so the URL stays the only source of truth. */
export function useCatalogParams(): UseCatalogParamsResult {
  const [searchParams, setSearchParams] = useSearchParams();

  /** `useMemo` keeps the same object until the URL changes, so effects that depend on it don't re-run. */
  const params = useMemo(() => parseCatalogParams(searchParams), [searchParams]);

  const change = useCallback(
    (catalogChange: CatalogChange) => {
      // Refining a search replaces its history entry, so Back doesn't walk through every half-typed word.
      // The first word of a search adds an entry, so Back still returns to the view you had before it.
      // Other changes add an entry too, so Back undoes them one at a time.
      const isRefiningSearch = catalogChange.type === "search" && searchParams.has("q");
      setSearchParams((current) => nextSearchParams(current, catalogChange), { replace: isRefiningSearch });
    },
    [searchParams, setSearchParams],
  );

  return { params, change };
}
