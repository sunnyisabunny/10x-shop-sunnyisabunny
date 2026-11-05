/**
 * NOTE: the page buttons: ‹ 1 2 3 … 17 › (PRD P2.7).
 * Why it exists: `limit` and `skip` mean only 12 products ever load at once, and this is how you reach the rest.
 * Connects to: `CatalogPage` passes the numbers and `onChange`. The URL is what really holds the page.
 */

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/**
 * Which page numbers to show: always the first and last, plus the current page's neighbours. Showing all 17
 * would not fit on a phone. The "gap" entries become the "…" between them.
 */
function visiblePages(page: number, totalPages: number): (number | "gap")[] {
  const wanted = [1, page - 1, page, page + 1, totalPages].filter((n) => n >= 1 && n <= totalPages);
  const unique = [...new Set(wanted)].sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  unique.forEach((n, index) => {
    if (index > 0 && n - unique[index - 1] > 1) {
      result.push("gap");
    }
    result.push(n);
  });
  return result;
}

const pageButton =
  "inline-flex size-11 items-center justify-center rounded-md bg-steel-raised font-semibold text-ink shadow-[inset_0_0_0_1px_var(--edge)] transition-colors duration-150 hover:bg-edge disabled:cursor-not-allowed disabled:text-edge-bright disabled:hover:bg-steel-raised";

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <nav aria-label="Pages" className="flex flex-wrap gap-1.5">
      {/* Disabled at the edges, so it is clear there is nothing further that way. */}
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={pageButton}>
        ‹
      </button>
      {visiblePages(page, totalPages).map((entry, index) =>
        entry === "gap" ? (
          // A gap has no value of its own, so its position is the only thing to key on, and it never reorders.
          <span key={`gap-${index}`} aria-hidden="true" className="inline-flex items-center px-1">
            …
          </span>
        ) : entry === page ? (
          <span
            key={entry}
            aria-current="page"
            className="led-text inline-flex size-11 items-center justify-center rounded-md bg-led-panel text-xl"
          >
            {entry}
          </span>
        ) : (
          <button key={entry} type="button" aria-label={`Page ${entry}`} onClick={() => onChange(entry)} className={pageButton}>
            {entry}
          </button>
        ),
      )}
      <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={pageButton}>
        ›
      </button>
    </nav>
  );
}
