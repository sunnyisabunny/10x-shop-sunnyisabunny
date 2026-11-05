/**
 * NOTE: the minus / number / plus control for choosing a quantity.
 * Why it exists: the product page and every cart line need the same control with the same limits.
 * Connects to: `ProductPage` and `CartLine`. The parent owns the number and passes it down, then this
 * tells the parent when it should change (a "callback prop", which is how lifting state up works).
 */

interface StepperProps {
  value: number;
  min?: number;
  max: number;
  /** Called with the new number when + or − is pressed. */
  onChange: (value: number) => void;
  /** Names the control for screen readers. */
  label?: string;
}

const stepButton = "size-11 rounded-md text-xl text-ink disabled:cursor-not-allowed disabled:text-edge-bright";

export default function Stepper({ value, min = 1, max, onChange, label = "Quantity" }: StepperProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-md bg-well shadow-[inset_0_0_0_1px_var(--edge)]">
      {/* Disabled at the limits, so it is clear why nothing would happen (PRD P3). */}
      <button type="button" aria-label="One less" disabled={value <= min} onClick={() => onChange(value - 1)} className={stepButton}>
        −
      </button>
      <output className="led-text min-w-10 text-center text-[22px]">{value}</output>
      <button type="button" aria-label="One more" disabled={value >= max} onClick={() => onChange(value + 1)} className={stepButton}>
        +
      </button>
    </div>
  );
}
