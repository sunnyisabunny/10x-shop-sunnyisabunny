/**
 * NOTE: the Login page, now managed by Formik and validated by Yup (PRD P1, FULL).
 * Why it exists: Checkout needs a logged-in user. CORE did this with useState by hand. This version replaces that
 * with `useFormik`, which holds the values, tracks which fields were touched, runs the schema and handles submit.
 * Connects to: `AuthContext` (login), `authSchemas.ts` (rules), `ProtectedRoute` (sends `from`).
 */
import { useFormik } from "formik";
import { Link, Navigate, useLocation } from "react-router";
import AuthCard, { authLinkStyles } from "../components/ui/AuthCard";
import { buttonStyles } from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { LoginFormValues } from "../types/user";
import { loginSchema } from "../utils/authSchemas";
import { MIN_PASSWORD_LENGTH } from "../utils/constants";
import { readFromPath } from "../utils/guards";

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  /**
   * Formik owns the form's state from here. `onSubmit` only runs once the schema passes.
   * It is `async` on purpose: Formik ends `isSubmitting` by itself when a returned promise finishes. A plain
   * function returns no promise, so `isSubmitting` would stay true and the button would stay disabled forever.
   * The password goes no further than this form: only the trimmed username reaches `login`.
   */
  const formik = useFormik<LoginFormValues>({
    initialValues: { username: "", password: "" },
    validationSchema: loginSchema,
    onSubmit: async ({ username }) => {
      const name = username.trim();
      login(name);
      showToast(`Logged in as ${name}.`);
    },
  });

  /** A field's error, shown only after it has been visited, so an untouched form isn't already red. */
  const errorFor = (name: keyof LoginFormValues) => (formik.touched[name] ? formik.errors[name] : undefined);

  // Once logged in, this page has nothing to offer, so it sends you on. This one line covers both cases: the
  // moment after submitting, and someone already logged in pressing Back or opening /login directly.
  // `replace` swaps this URL in history, so Back doesn't land here again.
  if (isLoggedIn) {
    return <Navigate to={readFromPath(location.state)} replace />;
  }

  return (
    <AuthCard title="Log in">
      {/* noValidate turns off the browser's own popups, so our exact error texts are the ones shown.
          formik.handleSubmit calls preventDefault for us, which stops the page reloading. */}
      <form onSubmit={formik.handleSubmit} noValidate className="grid gap-2">
        {/* getFieldProps gives each input its name, value, onChange and onBlur in one go. */}
        <FormField id="username" label="Username" autoComplete="username" {...formik.getFieldProps("username")} error={errorFor("username")} />
        <FormField id="password" label="Password" type="password" autoComplete="current-password" {...formik.getFieldProps("password")} error={errorFor("password")} />
        <button type="submit" disabled={formik.isSubmitting} className={buttonStyles.primary}>
          Log In
        </button>
      </form>
      <p className="text-[13px] text-ink-soft">This login is simulated. Any username works, with a password of at least {MIN_PASSWORD_LENGTH} characters.</p>
      <div className="flex flex-wrap justify-between gap-x-4">
        {/* `state` passes `from` along, so either detour still ends back at Checkout. */}
        <Link to="/signup" state={location.state} className={authLinkStyles}>
          Create an account
        </Link>
        <Link to="/reset-password" state={location.state} className={authLinkStyles}>
          Forgot your password?
        </Link>
      </div>
      <Link to="/" className={authLinkStyles}>
        ← Back to catalog
      </Link>
    </AuthCard>
  );
}
