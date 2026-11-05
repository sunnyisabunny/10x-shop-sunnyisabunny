/**
 * NOTE: the small "loading" mark shown while a page's code downloads (PRD O1).
 * Why it exists: pages now load on demand, so there is a moment when the code for the next page isn't here yet.
 * Connects to: the one `<Suspense>` in `Layout` uses this as its fallback.
 *
 * `role="status"` makes screen readers announce the hidden text. `page-spinner` is what `index.css` looks for to
 * hide the footer during that moment, so the footer can't jump when the page arrives.
 */
export default function Spinner() {
  return (
    <div role="status" className="page-spinner flex min-h-[50vh] items-center justify-center">
      <span className="sr-only">Loading…</span>
      <span aria-hidden="true" className="size-8 animate-spin rounded-full border-3 border-edge border-t-pink" />
    </div>
  );
}
