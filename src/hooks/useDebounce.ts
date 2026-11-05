/**
 * NOTE: gives you a value that only updates after it has stopped changing for a moment.
 * Why it exists: without it, typing "phone" would send 5 requests, one per letter (PRD P2.4).
 * Connects to: `CatalogToolbar`, for the search box.
 *
 * `<T>` is a generic, so this works for text, numbers or anything else.
 */
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  /** The calmed-down copy of the value. */
  const [debounced, setDebounced] = useState(value);

  // Each change starts a timer, and the cleanup cancels the previous one. So only the last change in a
  // burst survives long enough to update. Without the cleanup, every letter's timer would still fire.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
