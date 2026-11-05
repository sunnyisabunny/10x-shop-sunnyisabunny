/**
 * NOTE: the simulated password reset page (PRD P1.1, FULL). The annex names it but gives no rules, so ours are in
 * `PLAN.md`: an Email field, then one fixed line, and nothing is stored.
 * Why it exists: there is no server to send an email and no saved password to reset, so the honest thing is to say so.
 * Connects to: `resetPasswordSchema`. `LoginPage` links here.
 */
import { useFormik } from "formik";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import AuthCard, { authLinkStyles } from "../components/ui/AuthCard";
import { buttonStyles } from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import type { ResetPasswordValues } from "../types/user";
import { resetPasswordSchema } from "../utils/authSchemas";

export default function ResetPasswordPage() {
  const location = useLocation();

  /** Whether the form was submitted with a valid email, which swaps in the fixed line. */
  const [submitted, setSubmitted] = useState(false);

  /** The same pattern as `LoginPage`. `async` lets Formik end `isSubmitting` by itself. */
  const formik = useFormik<ResetPasswordValues>({
    initialValues: { email: "" },
    validationSchema: resetPasswordSchema,
    onSubmit: async () => {
      setSubmitted(true);
    },
  });

  return (
    <AuthCard title="Reset your password">
      {submitted ? (
        <p role="status" className="font-semibold">
          This is simulated, so no email was sent and nothing was changed. Any password works on the login page.
        </p>
      ) : (
        <form onSubmit={formik.handleSubmit} noValidate className="grid gap-2">
          <FormField id="email" label="Email" type="email" autoComplete="email" {...formik.getFieldProps("email")} error={formik.touched.email ? formik.errors.email : undefined} />
          <button type="submit" disabled={formik.isSubmitting} className={buttonStyles.primary}>
            Send reset link
          </button>
        </form>
      )}
      {/* `state` hands back the `from` that LoginPage passed here, so the detour doesn't lose the way to Checkout. */}
      <Link to="/login" state={location.state} className={authLinkStyles}>
        ← Back to login
      </Link>
    </AuthCard>
  );
}
