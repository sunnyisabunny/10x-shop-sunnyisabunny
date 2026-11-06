/**
 * NOTE: the bottom of an Endless list: it asks for more as it nears the screen, and has a button as well (BONUS).
 * Why it exists: scrolling alone would shut out keyboard users, so a visible "Load more" does the same job.
 * Connects to: `CatalogResults` draws this. `useEndlessProducts` supplies `more` and `onLoadMore`.
 */
import { useEffect, useRef } from "react";
import type { MoreState } from "../../hooks/useEndlessProducts";
import Button from "../ui/Button";

/** How far below the screen the next chunk starts loading, so people rarely catch up with the end of the list. */
const LOAD_AHEAD = "400px";

interface EndlessFooterProps {
  more: MoreState;
  onLoadMore: () => void;
  onRetry: () => void;
}

export default function EndlessFooter({ more, onLoadMore, onRetry }: EndlessFooterProps) {
  /** The element being watched. A ref, because the observer needs the real DOM node. */
  const watched = useRef<HTMLDivElement>(null);

  const canLoad = more.status === "idle";

  // Asks for more when this comes near the screen. A new observer reports straight away, so if a chunk arrives and this
  // is still close, on a tall screen say, the next one starts without waiting for a scroll. It only watches while `canLoad`
  // is true: after a failure, watching would repeat the failed request forever. The cleanup stops the old observer, or
  // every chunk would leave another one running, and each would ask for more.
  useEffect(() => {
    const element = watched.current;
    if (!canLoad || element === null) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: LOAD_AHEAD },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [canLoad, onLoadMore]);

  if (more.status === "done") {
    return <p className="px-1 py-3 text-center text-ink-soft tablet:px-0">That's everything. The machine has nothing else.</p>;
  }

  const isFailed = more.status === "error";

  return (
    <div ref={watched} className="grid justify-items-center gap-2 px-1 py-3 tablet:px-0">
      {/* Always in the page, because screen readers only announce changes inside a live region that already exists. */}
      <p role="status" className={isFailed ? "font-semibold text-error" : "text-ink-soft"}>
        {isFailed && more.message}
        {more.status === "loading" && "Loading more products…"}
      </p>
      {/* One button whose job changes, not two. Swapping it for another would drop keyboard focus out of the page. */}
      <Button variant="quiet" onClick={isFailed ? onRetry : onLoadMore}>
        {isFailed ? "Retry" : "Load more"}
      </Button>
    </div>
  );
}
