/**
 * NOTE: the machine's control panel: search box, category and sort dropdowns (PRD P2.4 to P2.6).
 * Why it exists: `CatalogPage` shouldn't hold the details of each control.
 * Connects to: `CatalogPage` passes the current values and `onChange`. It also loads the category list itself.
 */
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { useFetch } from "../../hooks/useFetch";
import type { Category } from "../../types/product";
import { SEARCH_DEBOUNCE_MS, SORT_OPTIONS } from "../../utils/constants";
import { formatCategory } from "../../utils/format";
import { hasPriceRange, isSortValue, type CatalogChange, type CatalogMode, type CatalogParams, type CatalogView } from "../../utils/url";
import { inputStyles, labelStyles } from "../ui/FormField";
import PriceFilter from "./PriceFilter";

interface CatalogToolbarProps {
  params: CatalogParams;
  onChange: (change: CatalogChange) => void;
}

/**
 * One look for both switches. `aria-pressed` tells screen readers which one is on, and the same attribute drives the
 * highlight. `hocus:` is this project's own variant from `index.css`: the hover style also appears on keyboard focus.
 */
const switchStyles =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-well text-ink-soft shadow-[inset_0_0_0_1px_var(--edge-bright)] transition-colors duration-150 hocus:text-ink aria-pressed:bg-led-panel aria-pressed:text-led";

/** The icon inside each view button. Decoration, because the button's `aria-label` already names it. */
function ViewIcon({ view }: { view: CatalogView }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {view === "grid" ? <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" /> : <path d="M3 4h18v4H3zM3 10h18v4H3zM3 16h18v4H3z" />}
    </svg>
  );
}

/** The grid and list switch (BONUS). It is hidden on a phone, where both views are the same sideways rows. */
function ViewToggle({ view, onChange }: { view: CatalogView; onChange: (view: CatalogView) => void }) {
  return (
    <div role="group" aria-label="View" className="hidden gap-1 tablet:flex">
      {(["grid", "list"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-label={option === "grid" ? "Grid view" : "List view"}
          aria-pressed={view === option}
          onClick={() => {
            if (option !== view) {
              onChange(option);
            }
          }}
          className={`${switchStyles} size-11`}
        >
          <ViewIcon view={option} />
        </button>
      ))}
    </div>
  );
}

/**
 * The Pages and Endless switch (BONUS). Endless is disabled during a price range, because the two can't combine, and the
 * page says so in words. Pages stays the default, because the PRD asks for pagination.
 */
function ModeSwitch({ mode, isEndlessOff, onChange }: { mode: CatalogMode; isEndlessOff: boolean; onChange: (mode: CatalogMode) => void }) {
  return (
    <div role="group" aria-label="Browsing" className="flex gap-1">
      {(["pages", "endless"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={mode === option}
          disabled={option === "endless" && isEndlessOff}
          onClick={() => {
            // Pressing the one already on does nothing. Otherwise it would lose the page and add a pointless Back step.
            if (option !== mode) {
              onChange(option);
            }
          }}
          className={`${switchStyles} px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {option === "pages" ? "Pages" : "Endless"}
        </button>
      ))}
    </div>
  );
}

export default function CatalogToolbar({ params, onChange }: CatalogToolbarProps) {
  const { state: categories } = useFetch<Category[]>("/products/categories");

  /** What is typed in the search box. It updates on every key, so typing never feels stuck. */
  const [text, setText] = useState(params.q);

  /** The same text, but only after typing has paused. This one is what reaches the URL. */
  const debouncedText = useDebounce(text, SEARCH_DEBOUNCE_MS);

  /**
   * True from a keystroke until that text has been sent. Only real typing may start a search. Without this,
   * choosing a category clears the search from the URL, the old text still in the box looks like a new search,
   * and sending it would clear the category again. See DEBUG-LOG.md.
   */
  const isTyping = useRef(false);

  // Keeps the box in step when the URL changes some other way: Back or Clear filters. It never touches the
  // box mid-typing, or letters typed just as a search reached the URL would be overwritten. The trim check
  // leaves a trailing space alone, or the space in "red shoes" would vanish the moment "red " was sent.
  useEffect(() => {
    if (!isTyping.current) {
      setText((current) => (current.trim() === params.q ? current : params.q));
    }
  }, [params.q]);

  // Sends the search to the URL once typing has paused.
  useEffect(() => {
    if (isTyping.current && debouncedText === text) {
      isTyping.current = false;
      if (text.trim() !== params.q) {
        onChange({ type: "search", q: text });
      }
    }
  }, [debouncedText, text, params.q, onChange]);

  /** Choosing a category replaces any search, including one still being typed, so that text is dropped now. */
  function handleCategoryChange(category: string) {
    isTyping.current = false;
    setText("");
    onChange({ type: "category", category });
  }

  // The URL can name a category that isn't in the list: an old link, or the list failing to load. It still
  // gets an option, so the dropdown tells the truth about the filter and "All categories" can clear it.
  const isKnownCategory = categories.status === "success" && categories.data.some((category) => category.slug === params.category);
  const showUrlCategory = params.category !== "" && !isKnownCategory;

  return (
    <div role="search" className="flex flex-wrap items-end gap-2.5">
      <label className={`${labelStyles} flex-[1_1_100%] tablet:flex-[1_1_240px]`}>
        Search
        <input
          type="search"
          value={text}
          placeholder="Search by name"
          onChange={(event) => {
            isTyping.current = true;
            setText(event.target.value);
          }}
          className={inputStyles}
        />
      </label>

      <label className={`${labelStyles} min-w-0 flex-[1_1_calc(50%-5px)] tablet:flex-none`}>
        Category
        <select
          value={params.category}
          onChange={(event) => handleCategoryChange(event.target.value)}
          className={inputStyles}
        >
          <option value="">All categories</option>
          {showUrlCategory && <option value={params.category}>{formatCategory(params.category)}</option>}
          {categories.status === "error" && <option disabled>Could not load categories</option>}
          {categories.status === "success" &&
            categories.data.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
        </select>
      </label>

      <label className={`${labelStyles} min-w-0 flex-[1_1_calc(50%-5px)] tablet:flex-none`}>
        Sort
        <select
          value={params.sort}
          onChange={(event) => {
            if (isSortValue(event.target.value)) {
              onChange({ type: "sort", sort: event.target.value });
            }
          }}
          className={inputStyles}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <PriceFilter min={params.min} max={params.max} onChange={(min, max) => onChange({ type: "price", min, max })} />

      {/* Together, because both choose how to browse rather than what to show, so they wrap as one group. */}
      <div className="flex gap-2.5">
        <ViewToggle view={params.view} onChange={(view) => onChange({ type: "view", view })} />
        <ModeSwitch mode={params.mode} isEndlessOff={hasPriceRange(params)} onChange={(mode) => onChange({ type: "mode", mode })} />
      </div>
    </div>
  );
}
