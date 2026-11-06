/**
 * NOTE: the bottom of an Endless list: it asks for more as it nears the screen, and has a button as well (BONUS).
 * Why it exists: scrolling alone would shut out keyboard users, so a visible button does the same job.
 * Connects to: `CatalogResults` draws this. `useEndlessProducts` supplies `more` and `onLoadMore`.
 */
import { useEffect, useRef } from "react";
import type { MoreState } from "@/hooks/useEndlessProducts";
import Button from "@/components/ui/Button";

/** How far below the screen the next chunk starts loading, so people rarely catch up with the end of the list. */
const LOAD_AHEAD = "400px";

interface EndlessFooterProps {
  more: MoreState;
  /** How many products are showing, so focus can find the first new one. */
  shown: number;
  onLoadMore: () => void;
  onRetry: () => void;
  onBackToTop: () => void;
}

/** What the footer says for each state. A function with a `switch`, so a new state can't be forgotten. */
function messageFor(more: MoreState): string {
  switch (more.status) {
    case "done":
      return "That's everything. The machine has nothing else.";
    case "error":
      return more.message;
    case "loading":
      return "Loading more products…";
    case "idle":
      return "";
  }
}

export default function EndlessFooter({ more, shown, onLoadMore, onRetry, onBackToTop }: EndlessFooterProps) {
  /** The element being watched. A ref, because the observer needs the real DOM node. */
  const watched = useRef<HTMLDivElement>(null);

  /** How many products were showing when the button was pressed, or null if nobody is waiting on it. A ref, because changing it needs no redraw. */
  const pressedAt = useRef<number | null>(null);

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

  // When products asked for with the button arrive, focus moves to the first of them. They appear above the button, so the
  // next Tab would otherwise skip them all. Scrolling doesn't do this, because it would drag someone away from what they're reading.
  useEffect(() => {
    if (pressedAt.current !== null && shown > pressedAt.current) {
      document.querySelectorAll<HTMLElement>("[data-slot] a[href^='/products/']")[pressedAt.current]?.focus();
      pressedAt.current = null;
    }
  }, [shown]);

  /** The button's job depends on where the list has got to. */
  function handlePress() {
    if (more.status === "done") {
      onBackToTop();
      return;
    }
    pressedAt.current = shown;
    if (more.status === "error") {
      onRetry();
    } else {
      onLoadMore();
    }
  }

  const isFailed = more.status === "error";
  const buttonLabel = isFailed ? "Retry" : more.status === "done" ? "Back to top" : "Load more";

  return (
    <div ref={watched} className="grid justify-items-center gap-2 px-1 py-3 tablet:px-0">
      {/* Always in the page, because screen readers only announce changes inside a live region that already exists.
          The minimum height keeps the button from jumping when a message appears. */}
      <p role="status" className={`min-h-6 text-center ${isFailed ? "font-semibold text-error" : "text-ink-soft"}`}>
        {messageFor(more)}
      </p>
      {/* One button whose job changes, not three. Swapping it for another would drop keyboard focus out of the page. */}
      <Button variant="quiet" onClick={handlePress}>
        {buttonLabel}
      </Button>
    </div>
  );
}
