/**
 * NOTE: short confirmation messages that appear for a moment at the bottom of the screen (PRD P0.5).
 * Why it exists: "Added to cart ✓" has to show wherever you pressed the button, and it must survive moving to
 * another page. Any component can call `showToast` without knowing how the message is drawn.
 * Connects to: `App.tsx` wraps the app in `ToastProvider`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { TOAST_MS } from "../utils/constants";

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** One message. The id makes a repeat of the same text count as new, which restarts its timer. */
interface Toast {
  id: number;
  message: string;
}

/** Holds the current message and draws it. It wraps the app, so any page can show a toast without passing props down. */
export function ToastProvider({ children }: { children: ReactNode }) {
  /** The message on screen, or null. One at a time, because a stack of them only adds noise. */
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  // Hides the message after a moment. The cleanup cancels the old timer when a new toast arrives, so a
  // stale timer can't hide the new message early. It depends on the whole `toast` object for that reason.
  useEffect(() => {
    if (toast === null) {
      return;
    }
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* This wrapper is always in the page, because screen readers only announce changes inside a live
          region that already exists. Adding it together with the message could go unannounced. */}
      <div data-screen-only role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {toast !== null && (
          <p className="rounded-md bg-led-panel px-4 py-2.5 font-semibold text-led shadow-[0_0_0_1px_rgb(255_182_39/0.4),0_10px_28px_rgb(0_0_0/0.5)]">
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** How components show a toast. Throws a clear message if the provider is missing. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
