/**
 * NOTE: the rules for the catalog's URL, as plain functions with no React in them.
 * Why it exists: search, category, sort and page live in the URL (PRD P2.8), so refresh, Back/Forward and
 * shared links all just work. Keeping the rules here means they can be read and tested in one place.
 * Connects to: `useCatalogParams` calls these, and `CatalogPage` uses what comes out.
 */
import { PAGE_SIZE, SORT_OPTIONS, type SortValue } from "./constants";

/** What the catalog is showing, read from the URL. */
export interface CatalogParams {
  q: string;
  category: string;
  sort: SortValue;
  page: number;
}

/**
 * Every way the catalog can change. A discriminated union: `type` says which one it is, and TypeScript
 * knows which other fields exist for each. A wrong combination simply doesn't compile.
 */
export type CatalogChange =
  | { type: "search"; q: string }
  | { type: "category"; category: string }
  | { type: "sort"; sort: SortValue }
  | { type: "page"; page: number };

/** A type guard: is this text one of our sort values? The URL can hold anything, because anyone can edit it. */
function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/** Reads the URL into typed values. Anything nonsense falls back to the default instead of breaking the page. */
export function parseCatalogParams(searchParams: URLSearchParams): CatalogParams {
  const sort = searchParams.get("sort") ?? "";
  const page = Number(searchParams.get("page"));
  return {
    q: searchParams.get("q") ?? "",
    category: searchParams.get("category") ?? "",
    sort: isSortValue(sort) ? sort : "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Sets a parameter, or removes it when empty, so a clean catalog has a clean URL. */
function setOrDelete(searchParams: URLSearchParams, key: string, value: string): void {
  if (value === "") {
    searchParams.delete(key);
  } else {
    searchParams.set(key, value);
  }
}

/**
 * The next URL for a change (PRD P2.8). The API can't search inside a category, so those two clear each
 * other, and any filter change goes back to page 1, because the old page number may not exist any more.
 * It builds a new object, so it never changes the one it was given.
 */
export function nextSearchParams(current: URLSearchParams, change: CatalogChange): URLSearchParams {
  const next = new URLSearchParams(current);
  switch (change.type) {
    case "search":
      setOrDelete(next, "q", change.q);
      next.delete("category");
      next.delete("page");
      break;
    case "category":
      setOrDelete(next, "category", change.category);
      next.delete("q");
      next.delete("page");
      break;
    case "sort":
      setOrDelete(next, "sort", change.sort);
      next.delete("page");
      break;
    case "page":
      setOrDelete(next, "page", change.page > 1 ? String(change.page) : "");
      break;
  }
  return next;
}

/**
 * Builds the API path for what the catalog is showing. URLSearchParams and encodeURIComponent make sure a
 * search for "50% & up" can't break the URL. Sorting works on all three endpoints, which was tested live.
 */
export function buildProductsUrl(params: CatalogParams): string {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String((params.page - 1) * PAGE_SIZE) });

  const sortOption = SORT_OPTIONS.find((option) => option.value === params.sort);
  if (sortOption && "sortBy" in sortOption) {
    query.set("sortBy", sortOption.sortBy);
    query.set("order", sortOption.order);
  }

  const searchText = params.q.trim();
  if (searchText !== "") {
    query.set("q", searchText);
    return `/products/search?${query}`;
  }
  if (params.category !== "") {
    return `/products/category/${encodeURIComponent(params.category)}?${query}`;
  }
  return `/products?${query}`;
}
