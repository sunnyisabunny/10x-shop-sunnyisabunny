/**
 * NOTE: one labelled input with its error message underneath.
 * Why it exists: every form needs the same label, the same error placement and the same accessibility
 * wiring. Writing this once means it can't be forgotten on one field.
 * Connects to: the Login and Checkout forms. They own the value. This component only displays it, which
 * is what makes it a "controlled" input.
 */
import type { InputHTMLAttributes } from "react";

/** The inset field look. Exported so selects and text areas can share it. */
export const inputStyles =
  "h-11 w-full rounded-md border-0 bg-well px-3 text-[15px] text-ink shadow-[inset_0_2px_5px_rgb(0_0_0/0.35),inset_0_0_0_1px_var(--edge)] placeholder:text-ink-soft focus:shadow-[inset_0_0_0_2px_var(--color-focus)] aria-invalid:shadow-[inset_0_0_0_2px_var(--color-sold-out)]";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Connects the label to the input. Clicking the label focuses the field, and screen readers read it. */
  id: string;
  label: string;
  /** The error text. Nothing shows when it is undefined. */
  error?: string;
}

export default function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-[13px] text-ink-soft">
        {label}
      </label>
      {/* aria-describedby makes screen readers read the error out when the field gets focus. */}
      <input
        id={id}
        className={inputStyles}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? errorId : undefined}
        {...inputProps}
      />
      {error !== undefined && (
        <p id={errorId} className="text-[13px] font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
}
