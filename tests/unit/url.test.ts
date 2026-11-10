/**
 * NOTE: unit tests for the catalog's URL rules in `src/utils/url.ts`.
 * Why it exists: these rules decide what the catalog shows after every search, filter, sort and page change, and what
 * it asks the API for. They are plain functions, so they can be checked here with no browser, server or network.
 * Connects to: `src/utils/url.ts` and `src/utils/constants.ts`, imported through the same `@/` alias the app uses, so
 * this file also proves the alias works in tests. Expected values use `PAGE_SIZE`, so a live change to it can't break them.
 */
import { describe, expect, it } from "vitest";
import { PAGE_SIZE } from "@/utils/constants";
import { buildProductsUrl, isPriceText, nextSearchParams, parseCatalogParams, type CatalogParams } from "@/utils/url";

/** The catalog with nothing chosen, written out once so each test only states what it changes. */
const DEFAULTS: CatalogParams = { q: "", category: "", sort: "", page: 1, view: "grid", mode: "pages", min: null, max: null };

/** Reads a query string the way the catalog does, so a test can say `read("page=2")`. */
function read(query: string): CatalogParams {
  return parseCatalogParams(new URLSearchParams(query));
}

/** Reading the URL: anything a person could type into the address bar must give a sensible catalog. */
describe("parseCatalogParams", () => {
  it("gives the defaults for an empty URL", () => {
    expect(read("")).toEqual(DEFAULTS);
  });

  it("lets the search win when a URL holds both a search and a category, because the API can't combine them", () => {
    expect(read("q=phone&category=laptops")).toMatchObject({ q: "phone", category: "" });
  });

  it("falls back to page 1 for anything that isn't a whole page number", () => {
    for (const page of ["0", "-2", "abc", "1e3", "2.5"]) {
      expect(read(`page=${page}`).page).toBe(1);
    }
    expect(read("page=3").page).toBe(3);
  });

  it("ignores a sort it doesn't know", () => {
    expect(read("sort=cheapest").sort).toBe("");
    expect(read("sort=price-asc").sort).toBe("price-asc");
  });

  it("reads a price range written backwards the right way round", () => {
    expect(read("min=50&max=10")).toMatchObject({ min: 10, max: 50 });
  });

  it("turns Endless off when a price range is set, and ignores the page in Endless", () => {
    expect(read("mode=endless&min=10").mode).toBe("pages");
    expect(read("mode=endless&page=4")).toMatchObject({ mode: "endless", page: 1 });
  });
});

/** Changing the URL: each control has a rule, and the rules must never mix the filters up. */
describe("nextSearchParams", () => {
  it("clears the category and the page when a search starts, and trims the search", () => {
    const next = nextSearchParams(new URLSearchParams("category=laptops&page=3"), { type: "search", q: "  phone " });
    expect(next.toString()).toBe("q=phone");
  });

  it("clears the search and the page when a category is picked", () => {
    const next = nextSearchParams(new URLSearchParams("q=phone&page=3"), { type: "category", category: "laptops" });
    expect(next.toString()).toBe("category=laptops");
  });

  it("leaves page 1 out of the URL, so the first page has a clean address", () => {
    expect(nextSearchParams(new URLSearchParams("page=3"), { type: "page", page: 1 }).toString()).toBe("");
  });

  it("keeps the page when only the view changes", () => {
    expect(nextSearchParams(new URLSearchParams("page=2"), { type: "view", view: "list" }).toString()).toBe("page=2&view=list");
  });

  it("never changes the URL object it was given", () => {
    const current = new URLSearchParams("q=phone&page=2");
    nextSearchParams(current, { type: "sort", sort: "price-desc" });
    expect(current.toString()).toBe("q=phone&page=2");
  });
});

/** Asking the API: the path must match what the catalog shows, whatever was typed into the search box. */
describe("buildProductsUrl", () => {
  it("skips a page's worth of products for each page after the first", () => {
    expect(buildProductsUrl({ ...DEFAULTS, page: 2 })).toBe(`/products?limit=${PAGE_SIZE}&skip=${PAGE_SIZE}`);
  });

  it("encodes a search, so symbols in it can't break the URL", () => {
    expect(buildProductsUrl({ ...DEFAULTS, q: "50% & up" })).toBe(`/products/search?limit=${PAGE_SIZE}&skip=0&q=50%25+%26+up`);
  });

  it("uses the category endpoint and adds the API's sort fields", () => {
    expect(buildProductsUrl({ ...DEFAULTS, category: "mens-shirts", sort: "price-asc" })).toBe(
      `/products/category/mens-shirts?limit=${PAGE_SIZE}&skip=0&sortBy=price&order=asc`,
    );
  });
});

/** The price filter's input check: a regex, because `Number()` accepts things no shopper means. */
describe("isPriceText", () => {
  it("accepts whole prices and prices with two decimals", () => {
    expect(isPriceText("10")).toBe(true);
    expect(isPriceText("9.99")).toBe(true);
  });

  it("rejects what Number() would wrongly accept", () => {
    for (const text of ["", "1e3", "-5", "9.999", " 7"]) {
      expect(isPriceText(text)).toBe(false);
    }
  });
});
