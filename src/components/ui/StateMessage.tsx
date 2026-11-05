/**
 * NOTE: the one message box for "loading", "something failed" and "nothing here" (PRD P0.6).
 * Why it exists: every page that fetches data needs all three, and they should look the same everywhere.
 * Connects to: `CatalogPage`, `ProductPage` and others.
 *
 * `children` is how the PRD's props.children composition shows up here: the caller can put a link or a
 * button inside the box without this component knowing what it is.
 */
import type { ReactNode } from "react";

interface StateMessageProps {
  title: string;
  /** "alert" makes screen readers announce it at once, for errors. "status" waits for a pause. */
  role?: "alert" | "status";
  children?: ReactNode;
}

export default function StateMessage({ title, role = "status", children }: StateMessageProps) {
  return (
    <div role={role} className="grid justify-items-start gap-3 rounded-[10px] bg-steel-raised p-6 shadow-[inset_0_0_0_1px_var(--edge)]">
      <p className="text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}
