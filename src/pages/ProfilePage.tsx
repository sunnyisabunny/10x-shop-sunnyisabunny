/**
 * NOTE: the Profile page: edit your details, switch theme, clear local data, log out (PRD P7).
 * Why it exists: it gives the simulated account somewhere to live.
 * Connects to: `AuthContext` holds the profile, and a saved name appears in the Header straight away.
 */
import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import { useNavigate } from "react-router";
import Button, { buttonStyles } from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import { formatAddress, useAddresses } from "../hooks/useAddresses";
import { useOrders } from "../hooks/useOrders";
import { useClearReviews } from "../hooks/useReviews";
import type { Profile } from "../types/user";
import { hasNoErrors, validateProfile, type FieldErrors } from "../utils/validation";

/** The form for someone who hasn't saved a profile yet. */
const EMPTY_PROFILE: Profile = { firstName: "", lastName: "", email: "", phone: "" };

/** A type guard for an input's `name`, which is a plain string. Better than an `as` cast, because it really checks. */
function isProfileField(name: string): name is keyof Profile {
  return name in EMPTY_PROFILE;
}

export default function ProfilePage() {
  const { user, profile, updateProfile, logout } = useAuth();
  const { clear } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { orders, clearOrders } = useOrders();
  const clearReviews = useClearReviews();
  const { clear: clearWishlist } = useWishlist();
  const { addresses, removeAddress, clearAddresses } = useAddresses();
  const navigate = useNavigate();

  /** The form's values, starting from the saved profile if there is one. */
  const [values, setValues] = useState<Profile>(profile ?? EMPTY_PROFILE);
  const [errors, setErrors] = useState<FieldErrors<Profile>>({});

  /** One handler for all the fields, using each input's `name`. Copies the object, as React needs. */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  /** PRD P0.5: checks a field when you leave it, and only that field, the same way Checkout does. */
  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const { name } = event.target;
    if (isProfileField(name)) {
      const message = validateProfile(values)[name];
      setErrors((current) => ({ ...current, [name]: message }));
    }
  }

  /** `preventDefault` stops the browser's page reload. Saved text is trimmed, and the form shows what was kept. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    if (hasNoErrors(nextErrors)) {
      const trimmed: Profile = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
      };
      setValues(trimmed);
      showToast(updateProfile(trimmed) ? "Changes saved ✓" : "Your changes could not be saved. Browser storage is full or blocked.");
    }
  }

  /**
   * PRD P7: empties the cart, orders and reviews, plus the wishlist and saved addresses, but keeps the login and the theme. Each goes through the code
   * that owns it. Removing the cart's storage key alone would do nothing: CartContext still holds the items,
   * and its effect would write them straight back on the next change.
   */
  function handleClearLocalData() {
    if (window.confirm("Clear your cart, orders, reviews, wishlist and saved addresses from this browser? This cannot be undone.")) {
      clear();
      clearOrders();
      clearReviews();
      clearWishlist();
      clearAddresses();
      showToast("Local data cleared");
    }
  }

  /** The same as the Header's Log out (PRD P0.3): back to the catalog, with the cart left alone. */
  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <section className="grid gap-3.5 p-3.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
      <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Profile</h1>
      <p className="text-ink-soft">
        Logged in as <strong className="text-ink">{user?.username}</strong>, with {orders.length === 1 ? "1 order" : `${orders.length} orders`}.
      </p>

      <div className="grid gap-5 desktop:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} noValidate className="grid gap-2 self-start rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
          <div className="grid gap-x-3.5 gap-y-2 md:grid-cols-2">
            <FormField id="firstName" name="firstName" label="First name" autoComplete="given-name" value={values.firstName} onChange={handleChange} onBlur={handleBlur} error={errors.firstName} />
            <FormField id="lastName" name="lastName" label="Last name" autoComplete="family-name" value={values.lastName} onChange={handleChange} onBlur={handleBlur} error={errors.lastName} />
          </div>
          <FormField id="email" name="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} />
          <FormField id="phone" name="phone" label="Phone" type="tel" autoComplete="tel" value={values.phone} onChange={handleChange} onBlur={handleBlur} error={errors.phone} />
          <button type="submit" className={buttonStyles.primary}>
            Save changes
          </button>
        </form>

        <aside className="grid gap-2.5 self-start rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
          <h2 className="font-bold">Saved addresses</h2>
          {addresses.length === 0 && <p className="text-ink-soft">None yet. You can save one at Checkout.</p>}
          {addresses.length > 0 && (
            <ul className="grid gap-1.5">
              {addresses.map((address) => (
                <li key={formatAddress(address)} className="flex items-center justify-between gap-2 border-b border-edge pb-1.5">
                  <span className="min-w-0 text-ink-soft">{formatAddress(address)}</span>
                  <Button variant="quiet" onClick={() => removeAddress(address)} aria-label={`Remove ${formatAddress(address)}`} className="shrink-0">
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="quiet" onClick={toggleTheme}>
            {theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          </Button>
          <Button variant="quiet" onClick={handleClearLocalData}>
            Clear local data
          </Button>
          <Button variant="quiet" onClick={handleLogout}>
            Log out
          </Button>
        </aside>
      </div>
    </section>
  );
}
