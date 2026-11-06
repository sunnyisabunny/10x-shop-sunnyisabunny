/**
 * NOTE: the catalog's Endless mode: loads one chunk at a time and keeps adding to the same list (BONUS).
 * Why it exists: `useFetch` remembers one answer, and Endless has to remember all of them.
 * Connects to: `useCatalogProducts` calls this, `ApiClient` does each request, and `EndlessFooter` asks for more.
 *
 * It has its own effect rather than using `useFetch`, because each answer has to join the list in a single update. An
 * earlier version copied `useFetch`'s answer across afterwards, and that extra step caused a real bug. See DEBUG-LOG.md.
 *
 * One idea delivers most of the rules: `path` is only set while a chunk is wanted, and the effect follows `path`. One path
 * means one request at a time. A new filter makes a new path, so the cleanup aborts the old request. A failure leaves
 * `products` alone, so the list already loaded stays on the screen.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/ApiClient";
import type { AsyncState } from "@/types/api";
import type { ProductSummary, ProductsResponse } from "@/types/product";
import { UNEXPECTED_ERROR } from "@/utils/constants";
import { isApiError } from "@/utils/guards";
import { buildChunkUrl, type CatalogParams } from "@/utils/url";
import type { UseFetchResult } from "./useFetch";

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
  /** True from asking for a chunk until it arrives. It stays true after a failure, so Retry asks for the same chunk. */
  isWanting: boolean;
  /** Why the last request failed, or null. */
  failure: string | null;
}

/** A list before anything has loaded. It wants its first chunk straight away. */
function emptyList(name: string | null): EndlessList {
  return { name, products: [], total: 0, isWanting: true, failure: null };
}

/** The stored list if it is still the right one, or a new one. So the old list is never used for new filters. */
function listNamed(stored: EndlessList, name: string | null): EndlessList {
  return stored.name === name ? stored : emptyList(name);
}

/** `null` means the catalog isn't in Endless, so nothing loads. Hooks can't be called conditionally, so this is how it waits. */
export function useEndlessProducts(params: CatalogParams | null): UseEndlessProductsResult {
  const name = params === null ? null : buildChunkUrl(params, 0);

  /** Everything loaded so far. One object, because these values have to change together, in one update. */
  const [stored, setStored] = useState<EndlessList>(() => emptyList(name));

  /** Counts retries. Bumping it changes the effect's dependencies, and that is what repeats the request. */
  const [attempt, setAttempt] = useState(0);

  const list = listNamed(stored, name);

  /** The chunk to load now, starting from wherever the list has reached, or null if none is wanted. */
  const path = params !== null && list.isWanting ? buildChunkUrl(params, list.products.length) : null;

  // Loads the chunk. The cleanup aborts it if the filters change first. Without that, its late answer would be added to
  // the new list. The update is a function, so it always builds on the latest list and can't undo another update.
  useEffect(() => {
    if (path === null) {
      return;
    }

    const controller = new AbortController();

    api
      .get<ProductsResponse<ProductSummary>>(path, controller.signal)
      .then(({ products, total }) => {
        if (!controller.signal.aborted) {
          setStored((current) => {
            const loaded = listNamed(current, name).products;
            return {
              name,
              products: [...loaded, ...products],
              // An empty chunk means the list is over, whatever `total` says. Without this, a wrong total would ask forever.
              total: products.length === 0 ? loaded.length : total,
              isWanting: false,
              failure: null,
            };
          });
        }
      })
      .catch((error: unknown) => {
        // A cancelled request isn't a failure. We asked for it, so nothing should be shown.
        if (!controller.signal.aborted) {
          const failure = isApiError(error) ? error.message : UNEXPECTED_ERROR;
          setStored((current) => ({ ...listNamed(current, name), failure }));
        }
      });

    return () => controller.abort();
  }, [path, name, attempt]);

  // Leaving Endless forgets the list, so coming back always starts from the top, as the README says. The check lets React
  // skip the redraw when there is nothing to forget, which is every time the catalog opens in Pages.
  useEffect(() => {
    if (name === null) {
      setStored((current) => (current.name === null ? current : emptyList(null)));
    }
  }, [name]);

  /**
   * Asks for the next chunk. This check is what really guarantees one request at a time and stopping at `total`, however
   * often it's called. `useCallback` keeps one function, so the footer's observer isn't rebuilt on every render.
   */
  const loadMore = useCallback(() => {
    setStored((current) => (current.isWanting || current.products.length >= current.total ? current : { ...current, isWanting: true }));
  }, []);

  /** Asks for the failed chunk again. */
  const retry = useCallback(() => {
    setStored((current) => ({ ...current, failure: null }));
    setAttempt((count) => count + 1);
  }, []);

  // The first chunk has no list to protect, so its loading and failure take over the whole area, as in Pages.
  const isFirstChunk = list.isWanting && list.products.length === 0;
  let state: AsyncState<ProductsResponse<ProductSummary>>;
  if (isFirstChunk) {
    state = list.failure === null ? { status: "loading" } : { status: "error", message: list.failure };
  } else {
    state = { status: "success", data: { products: list.products, total: list.total, skip: 0, limit: list.products.length } };
  }

  let more: MoreState;
  if (list.failure !== null) {
    more = { status: "error", message: list.failure };
  } else if (list.isWanting) {
    more = { status: "loading" };
  } else {
    more = { status: list.products.length >= list.total ? "done" : "idle" };
  }

  return { state, retry, endless: { more, loadMore } };
}
