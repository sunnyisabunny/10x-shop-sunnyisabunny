/**
 * NOTE: finds an element the shop has set aside for an extra, even if that element only appears later.
 * Why it exists: extras draw themselves into the page with `createPortal`, which needs a real DOM element. Pages load
 * lazily, so the element an extra wants may not exist yet when the extras arrive, and it goes away when the page changes.
 * Connects to: every extra that draws inside the shop. The shop marks each place with a plain `id`, and never imports the extra.
 */
import { useEffect, useState } from "react";

/** Returns the element with this id, and keeps the answer true as the page changes around it. */
export function useSlot(id: string): HTMLElement | null {
  /** The element, read straight away, so an extra whose place already exists draws without waiting for an effect. */
  const [slot, setSlot] = useState<HTMLElement | null>(() => document.getElementById(id));

  // Looks again whenever the page's content changes. Setting the same element does nothing, so this costs very little,
  // and looking up an id is fast. The cleanup stops watching when the extra goes away, or the observer would run forever.
  useEffect(() => {
    const find = () => setSlot(document.getElementById(id));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [id]);

  return slot;
}
