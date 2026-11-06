/**
 * NOTE: the catalog's Endless mode: loads one chunk at a time and keeps adding to the same list (BONUS).
 * Why it exists: `useFetch` remembers one answer, and Endless has to remember all of them. This hook is that memory.
 * Connects to: `useCatalogProducts` calls this, `useFetch` does each request, and `EndlessFooter` asks for more.
 *
 * The idea that keeps this short: `useFetch` is only given a path while a chunk is wanted. That alone delivers most of
 * the rules. There is one path, so one request at a time. A new filter makes a new path, so `useFetch` aborts the old
 * request. A failed chunk stays in `useFetch`'s state, so the list already loaded isn't touched.
 */
import { useCallback, useLayoutEffect, useState } from "react";
import type { ProductSummary, ProductsResponse } from "../types/product";
import { buildChunkUrl, type CatalogParams } from "../utils/url";
import { useFetch, type UseFetchResult } from "./useFetch";

/** The state of the list's bottom edge. A union, so only a failure can carry a message. */
export type MoreState = { status: "idle" | "loading" | "done" } | { status: "error"; message: string };

/** What the bottom of the list needs from this hook. */
export interface EndlessControls {
  more: MoreState;
  loadMore: () => void;
}

/** `useFetch`'s result, plus the controls. */
export interface UseEndlessProductsResult extends UseFetchResult<ProductsResponse<ProductSummary>> {
  endless: EndlessControls;
}

/** The chunks that have arrived, and which list they belong to. */
interface EndlessList {
  /** The first chunk's path, which names the list. A new search, category or sort changes it. */
  name: string | null;
  products: ProductSummary[];
  total: number;
  /** True from asking for a chunk until it arrives. */
  isWanting: boolean;
}

/** A list before anything has loaded. It wants its first chunk straight away. */
function emptyList(name: string | null): EndlessList {
  return { name, products: [], total: 0, isWanting: true };
}

/** `null` means the catalog isn't in Endless, so nothing loads. Hooks can't be called conditionally, so this is how it waits. */
export function useEndlessProducts(params: CatalogParams | null): UseEndlessProductsResult {
  const name = params === null ? null : buildChunkUrl(params, 0);

  /** Everything loaded so far. It holds a whole object because these values always change together. */
  const [stored, setStored] = useState<EndlessList>(() => emptyList(name));

  // Comparing names means the old list is never drawn for new filters, not even for one render, and no effect is needed.
  const list = stored.name === name ? stored : emptyList(name);

  const { state, retry } = useFetch<ProductsResponse<ProductSummary>>(params !== null && list.isWanting ? buildChunkUrl(params, list.products.length) : null);

  // A chunk has arrived, so it joins the list. It runs once per answer, because `isWanting` turns false, the path becomes
  // null and `state` stops being "success". A layout effect runs before the browser paints, so nobody sees the answer
  // before it joins. Not set during the render: React can drop that kind of update, and pressing Load more twice did
  // exactly that, which asked for the same chunk again. See DEBUG-LOG.md. The update is a function so it can't be lost.
  useLayoutEffect(() => {
    if (state.status !== "success") {
      return;
    }
    const { products, total } = state.data;
    setStored((current) => {
      const loaded = current.name === name ? current.products : [];
      return {
        name,
        products: [...loaded, ...products],
        // An empty chunk means the list is over, whatever `total` says. Without this, a wrong total would ask forever.
        total: products.length === 0 ? loaded.length : total,
        isWanting: false,
      };
    });
  }, [state, name]);

  /**
   * Asks for the next chunk. This check is what really guarantees one request at a time and stopping at `total`, however
   * often it's called. `useCallback` keeps one function, so the footer's observer isn't rebuilt on every render.
   */
  const loadMore = useCallback(() => {
    setStored((current) => (current.isWanting || current.products.length >= current.total ? current : { ...current, isWanting: true }));
  }, []);

  // The first chunk has no list to protect, so its loading and failure take over the whole area, as in Pages.
  const isFirstChunk = list.isWanting && list.products.length === 0;

  let more: MoreState;
  if (state.status === "error") {
    more = { status: "error", message: state.message };
  } else if (list.isWanting) {
    more = { status: "loading" };
  } else {
    more = { status: list.products.length >= list.total ? "done" : "idle" };
  }

  return {
    state: isFirstChunk ? state : { status: "success", data: { products: list.products, total: list.total, skip: 0, limit: list.products.length } },
    retry,
    endless: { more, loadMore },
  };
}
