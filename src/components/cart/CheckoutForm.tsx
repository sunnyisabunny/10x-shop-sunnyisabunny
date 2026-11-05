/**
 * NOTE: the Checkout form: controlled fields with validation (PRD P5.2).
 * Why it exists: splitting the form out keeps `CheckoutPage` about the page's flow, not about each input.
 * Connects to: `CheckoutPage` gets the valid values through `onPlaceOrder`. `validateCheckout` holds the rules.
 *
 * There is deliberately no card field here. The PRD rules out any banking data.
 */
import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import type { ShippingInfo } from "../../types/order";
import { COUNTRIES } from "../../utils/constants";
import { hasNoErrors, validateCheckout, type FieldErrors } from "../../utils/validation";
import { buttonStyles } from "../ui/Button";
import FormField, { FieldError, inputStyles } from "../ui/FormField";

interface CheckoutFormProps {
  /** Called only with values that passed validation. */
  onPlaceOrder: (shipping: ShippingInfo) => void;
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

/** A type guard for an input's `name`, which is a plain string. Better than an `as` cast, because it really checks. */
function isShippingField(name: string): name is keyof ShippingInfo {
  return name in EMPTY_FORM;
}

export default function CheckoutForm({ onPlaceOrder, isPlacing, failure }: CheckoutFormProps) {
  /** What is typed in each field. `value` and `onChange` on every input make this a controlled form. */
  const [values, setValues] = useState<ShippingInfo>(EMPTY_FORM);

  const [errors, setErrors] = useState<FieldErrors<ShippingInfo>>({});

  /** One handler for all the fields, using each input's `name`. Copies the object, as React needs. */
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
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
   * `preventDefault` stops the browser's page reload. Only a valid form goes on to place the order. The rules
   * ignore spaces around a value, so the spaces are removed here too, or they would be saved in the order.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCheckout(values);
    setErrors(nextErrors);
    if (hasNoErrors(nextErrors) && !isPlacing) {
      onPlaceOrder({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        city: values.city.trim(),
        postalCode: values.postalCode.trim(),
        country: values.country,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-2 self-start rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
      <FormField id="fullName" name="fullName" label="Full name" autoComplete="name" value={values.fullName} onChange={handleChange} onBlur={handleBlur} error={errors.fullName} />
      <div className="grid gap-x-3.5 gap-y-2 md:grid-cols-2">
        <FormField id="email" name="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} />
        <FormField id="phone" name="phone" label="Phone" type="tel" autoComplete="tel" value={values.phone} onChange={handleChange} onBlur={handleBlur} error={errors.phone} />
      </div>
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
      {failure !== null && (
        <p role="alert" className="font-semibold text-error">
          {failure}
        </p>
      )}
      <button type="submit" disabled={isPlacing} className={buttonStyles.primary}>
        Place order
      </button>
    </form>
  );
}
