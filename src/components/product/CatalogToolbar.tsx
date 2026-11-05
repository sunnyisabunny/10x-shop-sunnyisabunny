/**
 * NOTE: the machine's control panel: search box, category and sort dropdowns (PRD P2.4 to P2.6).
 * Why it exists: `CatalogPage` shouldn't hold the details of each control.
 * Connects to: `CatalogPage` passes the current values and `onChange`. It also loads the category list itself.
 */
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { useFetch } from "../../hooks/useFetch";
import type { Category } from "../../types/product";
import { SEARCH_DEBOUNCE_MS, SORT_OPTIONS, type SortValue } from "../../utils/constants";
import type { CatalogChange, CatalogParams } from "../../utils/url";
import { inputStyles } from "../ui/FormField";

interface CatalogToolbarProps {
  params: CatalogParams;
  onChange: (change: CatalogChange) => void;
}

/** A type guard for the sort dropdown. Its `value` is a plain string, so it can't be trusted as a SortValue. */
function isSortOption(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

const labelStyles = "grid gap-1 text-[13px] text-ink-soft";

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

  // Keeps the box in step when the URL changes some other way: Back, Clear filters, or choosing a category.
  useEffect(() => {
    setText(params.q);
    isTyping.current = false;
  }, [params.q]);

  // Sends the search to the URL once typing has paused.
  useEffect(() => {
    if (isTyping.current && debouncedText === text) {
      isTyping.current = false;
      if (text !== params.q) {
        onChange({ type: "search", q: text });
      }
    }
  }, [debouncedText, text, params.q, onChange]);

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
          onChange={(event) => onChange({ type: "category", category: event.target.value })}
          className={inputStyles}
        >
          <option value="">All categories</option>
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
            if (isSortOption(event.target.value)) {
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
    </div>
  );
}
