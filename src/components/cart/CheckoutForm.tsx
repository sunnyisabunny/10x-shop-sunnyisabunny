/**
 * NOTE: the Checkout form: four controlled fields with validation (PRD P5.2).
 * Why it exists: splitting the form out keeps `CheckoutPage` about the page's flow, not about each input.
 * Connects to: `CheckoutPage` gets the valid values through `onPlaceOrder`. `validateCheckout` holds the rules.
 *
 * There is deliberately no card field here. The PRD rules out any banking data.
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { ShippingInfo } from "../../types/order";
import { hasNoErrors, validateCheckout, type FieldErrors } from "../../utils/validation";
import { buttonStyles } from "../ui/Button";
import FormField from "../ui/FormField";

interface CheckoutFormProps {
  /** Called only with values that passed validation. */
  onPlaceOrder: (shipping: ShippingInfo) => void;
  /** True while the order is being placed. Disables the button, so a double click can't order twice. */
  isPlacing: boolean;
  /** A failure from placing the order, shown here. The form keeps what was typed. */
  failure: string | null;
}

export default function CheckoutForm({ onPlaceOrder, isPlacing, failure }: CheckoutFormProps) {
  /** What is typed in each field. `value` and `onChange` on every input make this a controlled form. */
  const [values, setValues] = useState<ShippingInfo>({ fullName: "", email: "", address: "", city: "" });

  const [errors, setErrors] = useState<FieldErrors<ShippingInfo>>({});

  /** One handler for all the fields, using each input's `name`. Copies the object, as React needs. */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  /** `preventDefault` stops the browser's page reload. Only a valid form goes on to place the order. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCheckout(values);
    setErrors(nextErrors);
    if (hasNoErrors(nextErrors) && !isPlacing) {
      onPlaceOrder(values);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-3.5 rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
      <FormField id="fullName" name="fullName" label="Full name" autoComplete="name" value={values.fullName} onChange={handleChange} error={errors.fullName} />
      <FormField id="email" name="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
      <FormField id="address" name="address" label="Address" autoComplete="street-address" value={values.address} onChange={handleChange} error={errors.address} />
      <FormField id="city" name="city" label="City" autoComplete="address-level2" value={values.city} onChange={handleChange} error={errors.city} />
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
