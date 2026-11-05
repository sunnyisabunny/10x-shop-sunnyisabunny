/**
 * NOTE: shown for any URL that doesn't exist, and for products that don't exist (PRD P0.1).
 * Why it exists: a dead link should still leave you inside the shop, with a way back.
 * Connects to: the `*` route in `AppRoutes.tsx`, and `ProductPage.tsx`.
 */
import { Link } from "react-router";
import { buttonStyles } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <section className="flex flex-col items-start gap-3 p-3.5 tablet:p-6">
      <p aria-hidden="true" className="led-text inline-block rounded-md bg-led-panel px-3 text-[64px] leading-tight">
        404
      </p>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-ink-soft">The page you are looking for does not exist.</p>
      <Link to="/" className={buttonStyles.primary}>
        Go to catalog
      </Link>
    </section>
  );
}
