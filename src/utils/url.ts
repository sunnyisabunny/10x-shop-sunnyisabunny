/**
 * NOTE: the rules for the catalog's URL, as plain functions with no React in them.
 * Why it exists: search, category, sort and page live in the URL (PRD P2.8), so refresh, Back/Forward and
 * shared links all just work. Keeping the rules here means they can be read and tested in one place.
 * Connects to: `useCatalogParams` calls these, and `CatalogPage` uses what comes out.
 */
import { PAGE_SIZE, SORT_OPTIONS, type SortValue } from "./constants";

/** How the products are drawn. The default is left out of the URL, so a clean catalog keeps a clean address. */
export type CatalogView = "grid" | "list";

/** What the catalog is showing, read from the URL. */
export interface CatalogParams {
  q: string;
  category: string;
  sort: SortValue;
  page: number;
  view: CatalogView;
}

/**
 * Every way the catalog can change. A discriminated union: `type` says which one it is, and TypeScript
 * knows which other fields exist for each. A wrong combination simply doesn't compile.
 */
export type CatalogChange =
  | { type: "search"; q: string }
  | { type: "category"; category: string }
  | { type: "sort"; sort: SortValue }
  | { type: "page"; page: number }
  | { type: "view"; view: CatalogView };

/** A type guard: is this text one of our sort values? The URL can hold anything, because anyone can edit it. */
export function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

/**
 * Reads the URL into typed values. Anything nonsense falls back to the default instead of breaking the page.
 * A hand-written URL could hold both `q` and `category`, but the API can't combine them, so the search wins.
 * The page uses a regex because Number("1e3") would count as page 1000.
 */
export function parseCatalogParams(searchParams: URLSearchParams): CatalogParams {
  const q = (searchParams.get("q") ?? "").trim();
  const sort = searchParams.get("sort") ?? "";
  const pageText = searchParams.get("page") ?? "";
  const page = /^[1-9]\d*$/.test(pageText) ? Number(pageText) : 1;
  return {
    q,
    category: q === "" ? (searchParams.get("category") ?? "") : "",
    sort: isSortValue(sort) ? sort : "",
    page: Number.isSafeInteger(page) ? page : 1,
    view: searchParams.get("view") === "list" ? "list" : "grid",
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
      // Trimmed here so the URL holds what is really searched, and spaces alone count as no search.
      setOrDelete(next, "q", change.q.trim());
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
    case "view":
      // Unlike a filter, this keeps the page: the same products are just drawn differently.
      setOrDelete(next, "view", change.view === "list" ? "list" : "");
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

  if (params.q !== "") {
    query.set("q", params.q);
    return `/products/search?${query}`;
  }
  if (params.category !== "") {
    return `/products/category/${encodeURIComponent(params.category)}?${query}`;
  }
  return `/products?${query}`;
}
