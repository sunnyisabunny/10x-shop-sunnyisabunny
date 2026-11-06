/**
 * NOTE: the Checkout form, in three steps: Contact, Delivery and Review (PRD P5.2, multi-step is BONUS).
 * Why it exists: splitting the form out keeps `CheckoutPage` about the page's flow, not about each input.
 * Connects to: `CheckoutPage` gets the valid values through `onPlaceOrder`. `validateCheckout` holds the rules.
 *
 * It is still one `<form>` with one state object. Each step only chooses which fields to draw, so going back keeps
 * everything typed, and pressing Enter in a field means the same as the step's button. The step is kept in the browser's
 * history, so the browser's own Back button goes back a step instead of leaving the page and losing what was typed.
 *
 * There is deliberately no card field here. The PRD rules out any banking data.
 */
import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import type { SavedAddress, ShippingInfo } from "@/types/order";
import { COUNTRIES } from "@/utils/constants";
import { isRecord } from "@/utils/guards";
import { hasNoErrors, validateCheckout, type FieldErrors } from "@/utils/validation";
import Button, { buttonStyles } from "@/components/ui/Button";
import FormField, { FieldError, inputStyles } from "@/components/ui/FormField";
import AddressPicker from "./AddressPicker";

interface CheckoutFormProps {
  /** Called only with values that passed validation. The second part says whether to save the address too. */
  onPlaceOrder: (shipping: ShippingInfo, saveAddress: boolean) => void;
  /** Addresses saved earlier, offered on the Delivery step. */
  savedAddresses: SavedAddress[];
  /** True while the order is being placed. Disables the button, so a double click can't order twice. */
  isPlacing: boolean;
  /** A failure from placing the order, shown here. The form keeps what was typed. */
  failure: string | null;
}

/** The form when it opens, with Georgia chosen as the spec asks. */
const EMPTY_FORM: ShippingInfo = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: COUNTRIES[0],
};

/** The steps, and which fields each one checks before moving on. Review has none, because it only shows the rest. */
const STEPS: { title: string; fields: (keyof ShippingInfo)[] }[] = [
  { title: "Contact", fields: ["fullName", "email", "phone"] },
  { title: "Delivery", fields: ["address", "city", "postalCode", "country"] },
  { title: "Review", fields: [] },
];
const REVIEW_STEP = STEPS.length - 1;

/** A type guard for an input's `name`, which is a plain string. Better than an `as` cast, because it really checks. */
function isShippingField(name: string): name is keyof ShippingInfo {
  return name in EMPTY_FORM;
}

/** Only the errors for the given fields, so moving on from one step doesn't light up the ones not reached yet. */
function errorsFor(values: ShippingInfo, fields: (keyof ShippingInfo)[]): FieldErrors<ShippingInfo> {
  const all = validateCheckout(values);
  const chosen: FieldErrors<ShippingInfo> = {};
  for (const field of fields) {
    if (all[field] !== undefined) {
      chosen[field] = all[field];
    }
  }
  return chosen;
}

/** The first step whose fields aren't valid yet, or Review if they all are. Nothing later than this can be shown. */
function furthestStep(values: ShippingInfo): number {
  const blocked = STEPS.findIndex(({ fields }) => !hasNoErrors(errorsFor(values, fields)));
  return blocked === -1 ? REVIEW_STEP : blocked;
}

/** Reads the step from `location.state`, which has the type `any`, so its real shape is checked here. */
function readStep(state: unknown): number {
  return isRecord(state) && typeof state.step === "number" ? state.step : 0;
}

/** Shows which step you are on. Words and ticks carry the meaning, so it doesn't rely on colour. */
function StepList({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap gap-x-5 gap-y-1">
      {STEPS.map(({ title }, index) => (
        <li key={title} aria-current={index === step ? "step" : undefined} className={`flex min-h-6 items-center gap-1.5 font-semibold ${index === step ? "text-ink" : "text-ink-soft"}`}>
          <span aria-hidden="true" className="led-text inline-flex size-6 items-center justify-center rounded bg-led-panel text-[15px]">
            {index < step ? "✓" : index + 1}
          </span>
          {title}
          {index < step && <span className="sr-only">, completed</span>}
        </li>
      ))}
    </ol>
  );
}

/** One line of the Review step, with a way back to the step that holds it. */
function ReviewBlock({ title, lines, onEdit, disabled }: { title: string; lines: string[]; onEdit: () => void; disabled: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-edge pb-2.5">
      <div className="min-w-0">
        <h3 className="font-bold">{title}</h3>
        {/* The index is a safe key here: this list never reorders, and two lines can hold the same text. */}
        {lines.map((line, index) => (
          <p key={index} className="text-ink-soft">
            {line}
          </p>
        ))}
      </div>
      <Button variant="quiet" onClick={onEdit} disabled={disabled} aria-label={`Change ${title.toLowerCase()} details`} className="shrink-0">
        Change
      </Button>
    </div>
  );
}

export default function CheckoutForm({ onPlaceOrder, savedAddresses, isPlacing, failure }: CheckoutFormProps) {
  /** What is typed in each field. `value` and `onChange` on every input make this a controlled form. */
  const [values, setValues] = useState<ShippingInfo>(EMPTY_FORM);

  const [errors, setErrors] = useState<FieldErrors<ShippingInfo>>({});

  /** Whether to keep this address for next time. Off by default, because it is the shopper's choice to make. */
  const [saveAddress, setSaveAddress] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Which step is showing, as a position in `STEPS`. It comes from the browser's history, and it is never later than the
   * typed data allows. So Review can't appear with nothing to review, such as after a reload, which keeps the step but
   * loses the typing, and the Forward button can't skip a check.
   */
  const step = Math.min(readStep(location.state), furthestStep(values));

  /** Each new step's heading, so keyboard and screen reader users land at the top of what just appeared. */
  const headingRef = useRef<HTMLHeadingElement>(null);

  /** The step at the last draw, so opening the page doesn't pull focus away from the Header. */
  const previousStep = useRef(step);

  // The button just pressed may no longer exist, so without this, focus would fall out of the page on each step.
  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      headingRef.current?.focus();
    }
  }, [step]);

  function goToStep(next: number) {
    navigate(location.pathname, { state: { step: next } });
  }

  /**
   * Continue and Place order are one button in one place. Without this, the second click of a double click on Continue
   * would land on Place order and place an order nobody reviewed. `detail` counts clicks in a row, and a keyboard press
   * counts as 0. Stopping the click's default action is what stops it submitting the form.
   */
  function ignoreRepeatClick(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail > 1) {
      event.preventDefault();
    }
  }

  /** One handler for all the fields, using each input's `name`. Copies the object, as React needs. */
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  /** Fills the Delivery fields from a saved address, and clears any errors they were showing. */
  function handlePickAddress({ address, city, postalCode, country }: SavedAddress) {
    setValues((current) => ({ ...current, address, city, postalCode, country }));
    setErrors((current) => ({ ...current, address: undefined, city: undefined, postalCode: undefined, country: undefined }));
  }

  /**
   * PRD P0.5: checks a field when you leave it, not only on submit. It updates just that field's error, so
   * filling in the form top to bottom doesn't light up the fields you haven't reached yet.
   */
  function handleBlur(event: FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name } = event.target;
    if (isShippingField(name)) {
      const message = validateCheckout(values)[name];
      setErrors((current) => ({ ...current, [name]: message }));
    }
  }

  /**
   * Runs on the step's button, or on Enter in a field. `preventDefault` stops the browser's page reload. Before Review
   * it checks only this step's fields and moves on. Review needs no check, because `step` can't reach it with bad data.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < REVIEW_STEP) {
      const stepErrors = errorsFor(values, STEPS[step].fields);
      setErrors(stepErrors);
      if (hasNoErrors(stepErrors)) {
        goToStep(step + 1);
      }
      return;
    }
    if (!isPlacing) {
      onPlaceOrder(trimmed, saveAddress);
    }
  }

  // The rules ignore spaces around a value, so they are removed here too, or they would be saved in the order. Review
  // reads this same object, so what it shows is exactly what gets saved.
  const trimmed: ShippingInfo = {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country,
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-2 self-start rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
      <StepList step={step} />
      {/* tabIndex -1 lets code focus the heading without adding it to the Tab order. */}
      <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-[20px] font-bold">
        <span className="sr-only">
          Step {step + 1} of {STEPS.length}:{" "}
        </span>
        {STEPS[step].title}
      </h2>

      {step === 0 && (
        <>
          <FormField id="fullName" name="fullName" label="Full name" autoComplete="name" value={values.fullName} onChange={handleChange} onBlur={handleBlur} error={errors.fullName} />
          <div className="grid gap-x-3.5 gap-y-2 md:grid-cols-2">
            <FormField id="email" name="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} />
            <FormField id="phone" name="phone" label="Phone" type="tel" autoComplete="tel" value={values.phone} onChange={handleChange} onBlur={handleBlur} error={errors.phone} />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <AddressPicker addresses={savedAddresses} onPick={handlePickAddress} />
          <FormField id="address" name="address" label="Address" autoComplete="street-address" value={values.address} onChange={handleChange} onBlur={handleBlur} error={errors.address} />
          <div className="grid gap-x-3.5 gap-y-2 md:grid-cols-2">
            <FormField id="city" name="city" label="City" autoComplete="address-level2" value={values.city} onChange={handleChange} onBlur={handleBlur} error={errors.city} />
            <FormField id="postalCode" name="postalCode" label="Postal code" autoComplete="postal-code" value={values.postalCode} onChange={handleChange} onBlur={handleBlur} error={errors.postalCode} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="country" className="text-[13px] text-ink-soft">
              Country
            </label>
            <select
              id="country"
              name="country"
              autoComplete="country-name"
              value={values.country}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={errors.country !== undefined}
              aria-describedby={errors.country !== undefined ? "country-error" : undefined}
              className={inputStyles}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <FieldError id="country-error" message={errors.country} />
          </div>
          {/* The whole row is the label, so the tap target is 44px tall even though the box itself is small. */}
          <label className="flex min-h-11 items-center gap-2.5 font-semibold">
            <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} className="size-5 accent-pink" />
            Save this address for next time
          </label>
        </>
      )}

      {step === REVIEW_STEP && (
        <div className="grid gap-2.5">
          <ReviewBlock title="Contact" lines={[trimmed.fullName, trimmed.email, trimmed.phone]} onEdit={() => goToStep(0)} disabled={isPlacing} />
          <ReviewBlock title="Delivery" lines={[trimmed.address, `${trimmed.city} ${trimmed.postalCode}`, trimmed.country]} onEdit={() => goToStep(1)} disabled={isPlacing} />
        </div>
      )}

      {failure !== null && step === REVIEW_STEP && (
        <p role="alert" className="font-semibold text-error">
          {failure}
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-2.5">
        {step > 0 && (
          <Button variant="quiet" onClick={() => goToStep(step - 1)} disabled={isPlacing}>
            Back
          </Button>
        )}
        <button type="submit" disabled={isPlacing} onClick={ignoreRepeatClick} className={`${buttonStyles.primary} flex-1`}>
          {step === REVIEW_STEP ? "Place order" : "Continue"}
        </button>
      </div>
    </form>
  );
}
