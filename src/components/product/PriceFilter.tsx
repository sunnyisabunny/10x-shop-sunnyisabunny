/**
 * NOTE: the price range in the catalog's control panel (BONUS).
 * Why it exists: 133 of the 194 products cost $100 or less, so a slider would crowd nearly everything into one end.
 * Two number fields with a button give exact control, and only one change of the URL.
 * Connects to: `CatalogToolbar` draws this and passes `onChange`. `useCatalogProducts` does the filtering.
 */
import { useState, type FormEvent } from "react";
import { hasPriceRange, isPriceText } from "../../utils/url";
import Button from "../ui/Button";
import { inputStyles, labelStyles } from "../ui/FormField";

interface PriceFilterProps {
  min: number | null;
  max: number | null;
  onChange: (min: string, max: string) => void;
}

/** A price as text for a field. An empty field means no limit on that side. */
function toText(price: number | null): string {
  return price === null ? "" : String(price);
}

export default function PriceFilter({ min, max, onChange }: PriceFilterProps) {
  /** What is typed in each field, which only reaches the URL when the button is pressed. */
  const [minText, setMinText] = useState(toText(min));
  const [maxText, setMaxText] = useState(toText(max));
  const [error, setError] = useState<string | null>(null);

  /** The range the fields last took from the URL. */
  const [applied, setApplied] = useState(`${min}-${max}`);

  // When the URL's range changes, such as with Back or Clear filters, the fields follow it. Setting state during a
  // render like this is React's own pattern for adjusting state to a new prop: React redraws at once, before anything
  // reaches the screen. A `key` would be simpler, but it would remake the form and drop keyboard focus out of the page.
  if (applied !== `${min}-${max}`) {
    setApplied(`${min}-${max}`);
    setMinText(toText(min));
    setMaxText(toText(max));
    setError(null);
  }

  /**
   * `preventDefault` stops the browser's page reload. The check is the same one the URL uses, so anything that would
   * be ignored there gets a message here. A range entered backwards isn't an error: the URL reads it the right way round.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isValid = [minText, maxText].every((text) => text === "" || isPriceText(text));
    setError(isValid ? null : "Enter a price like 10 or 9.99");
    if (isValid) {
      onChange(minText, maxText);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid flex-[1_1_100%] gap-1 tablet:flex-none">
      <div className="flex items-end gap-2">
        <label className={`${labelStyles} min-w-0 flex-1 tablet:w-24 tablet:flex-none`}>
          Min price
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={minText}
            onChange={(event) => setMinText(event.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? "price-error" : undefined}
            className={inputStyles}
          />
        </label>
        <label className={`${labelStyles} min-w-0 flex-1 tablet:w-24 tablet:flex-none`}>
          Max price
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={maxText}
            onChange={(event) => setMaxText(event.target.value)}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? "price-error" : undefined}
            className={inputStyles}
          />
        </label>
        <Button variant="quiet" type="submit" className="shrink-0 whitespace-nowrap">
          Set price
        </Button>
        {hasPriceRange({ min, max }) && (
          <Button variant="quiet" onClick={() => onChange("", "")} className="shrink-0 whitespace-nowrap">
            Clear price
          </Button>
        )}
      </div>
      {error !== null && (
        <p id="price-error" role="alert" className="text-[13px] font-semibold text-error">
          {error}
        </p>
      )}
    </form>
  );
}
