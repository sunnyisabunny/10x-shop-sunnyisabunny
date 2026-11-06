/**
 * NOTE: the price range in the catalog's control panel (BONUS).
 * Why it exists: 133 of the 194 products cost $100 or less, so a slider would crowd nearly everything into one end.
 * Two number fields with an Apply button give exact control, and only one change of the URL.
 * Connects to: `CatalogToolbar` draws this and passes `onChange`. `useCatalogProducts` does the filtering.
 */
import { useState, type FormEvent } from "react";
import { buttonStyles } from "../ui/Button";
import { inputStyles } from "../ui/FormField";

interface PriceFilterProps {
  min: number | null;
  max: number | null;
  onChange: (min: string, max: string) => void;
}

const labelStyles = "grid gap-1 text-[13px] text-ink-soft";

/**
 * The fields hold what is being typed, starting from the URL. `CatalogToolbar` gives this component a `key` made from
 * the URL's range, so when the URL changes some other way, such as Back or Clear filters, it starts fresh with the new
 * values. That is simpler than an effect copying them across.
 */
export default function PriceFilter({ min, max, onChange }: PriceFilterProps) {
  const [minText, setMinText] = useState(min === null ? "" : String(min));
  const [maxText, setMaxText] = useState(max === null ? "" : String(max));
  const [error, setError] = useState<string | null>(null);

  /** `preventDefault` stops the browser's page reload. A reversed range can only be a slip, so it gets a message. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (minText !== "" && maxText !== "" && Number(minText) > Number(maxText)) {
      setError("Min price can't be above max price");
      return;
    }
    setError(null);
    onChange(minText, maxText);
  }

  const isActive = min !== null || max !== null;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid flex-[1_1_100%] gap-1 tablet:flex-none">
      <div className="flex items-end gap-2">
        <label className={`${labelStyles} min-w-0 flex-1 tablet:w-24 tablet:flex-none`}>
          Min price
          <input type="number" min="0" step="0.01" inputMode="decimal" value={minText} onChange={(event) => setMinText(event.target.value)} className={inputStyles} />
        </label>
        <label className={`${labelStyles} min-w-0 flex-1 tablet:w-24 tablet:flex-none`}>
          Max price
          <input type="number" min="0" step="0.01" inputMode="decimal" value={maxText} onChange={(event) => setMaxText(event.target.value)} className={inputStyles} />
        </label>
        <button type="submit" className={`${buttonStyles.quiet} shrink-0 whitespace-nowrap`}>
          Set price
        </button>
        {isActive && (
          <button type="button" onClick={() => onChange("", "")} className={`${buttonStyles.quiet} shrink-0 whitespace-nowrap`}>
            Clear price
          </button>
        )}
      </div>
      {error !== null && (
        <p role="alert" className="text-[13px] font-semibold text-error">
          {error}
        </p>
      )}
    </form>
  );
}
