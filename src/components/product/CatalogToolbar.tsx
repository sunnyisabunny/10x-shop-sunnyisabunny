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
import { isSortValue, type CatalogChange, type CatalogParams } from "../../utils/url";
import { inputStyles } from "../ui/FormField";

interface CatalogToolbarProps {
  params: CatalogParams;
  onChange: (change: CatalogChange) => void;
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
    </div>
  );
}
