/**
 * NOTE: a reusable hook that loads JSON and reports its progress as an AsyncState.
 * Why it exists: every page that fetches needs the same effect, cancellation and error handling. Before this
 * hook, the Catalog and Product pages each repeated about 30 lines of it.
 * Connects to: `ApiClient` does the request. `CatalogPage` and `ProductPage` read `state` and call `retry`.
 *
 * `<T>` is a generic: `useFetch<Product>(...)` gives a state whose `data` is a Product. One hook, many types.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/ApiClient";
import type { AsyncState } from "../types/api";
import { UNEXPECTED_ERROR } from "../utils/constants";
import { isApiError } from "../utils/guards";

/** A hook's return value is its public API, so it gets a named shape like a component's props. */
export interface UseFetchResult<T> {
  state: AsyncState<T>;
  retry: () => void;
}

/** `path` can be null to mean "nothing to load", which keeps the state at "idle". */
export function useFetch<T>(path: string | null): UseFetchResult<T> {
  /**
   * The current stage of the request, and which path it belongs to. The stage is a union, so loading and error can
   * never both be true. The path is what stops an old answer being shown for a new question, as explained below.
   */
  const [result, setResult] = useState<{ path: string | null; state: AsyncState<T> }>({ path, state: path === null ? { status: "idle" } : { status: "loading" } });

  /** Counts retries. Bumping it changes the effect's dependencies, and that is what repeats the request. */
  const [attempt, setAttempt] = useState(0);

  // Loads whenever the path changes or Retry is pressed.
  useEffect(() => {
    if (path === null) {
      // The check lets React skip the redraw when this is already idle. In Endless the catalog's `useFetch` sits here.
      setResult((current) => (current.path === null ? current : { path, state: { status: "idle" } }));
      return;
    }

    // The defence question: "what happens without AbortController?" Say you click to product 2, then quickly
    // to product 3. If product 2's slower answer arrives last, it overwrites product 3, and the page shows
    // the wrong product. Aborting the old request in the cleanup makes that impossible.
    const controller = new AbortController();
    setResult({ path, state: { status: "loading" } });

    api
      .get<T>(path, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ path, state: { status: "success", data } });
        }
      })
      .catch((error: unknown) => {
        // A cancelled request isn't a failure. We asked for it, so nothing should be shown.
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          path,
          state: {
            status: "error",
            message: isApiError(error) ? error.message : UNEXPECTED_ERROR,
            httpStatus: isApiError(error) ? error.status : undefined,
          },
        });
      });

    return () => controller.abort();
  }, [path, attempt]);

  /** `useCallback` keeps one stable function, so a child given `retry` doesn't redraw for no reason. */
  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  // An effect only runs after a render. So on the render where the path changes, `result` still holds the old path's
  // answer, and drawing it would show the wrong data for a moment. Comparing the two paths means "loading" straight away,
  // or "idle" if there is now nothing to load, since no request is about to start.
  const nextState: AsyncState<T> = path === null ? { status: "idle" } : { status: "loading" };
  const state = result.path === path ? result.state : nextState;

  return { state, retry };
}
