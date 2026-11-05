/**
 * NOTE: the simulated Sign Up page (PRD P1.1, FULL). The annex names it but gives no rules, so ours are in `PLAN.md`.
 * Why it exists: a shop needs a way to start an account, even a pretend one.
 * Connects to: `AuthContext.signUp` and `signUpSchema`. `LoginPage` links here and passes `from` along.
 *
 * It keeps the username and email and nothing else. The PRD forbids storing credentials, so the password is only
 * compared with its confirmation and then forgotten. That also means no later login can check it. Any password
 * works on Login, as the page there says.
 */
import { useFormik } from "formik";
import { Link, useLocation, useNavigate } from "react-router";
import AuthCard, { authLinkStyles } from "../components/ui/AuthCard";
import { buttonStyles } from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { SignUpFormValues } from "../types/user";
import { signUpSchema } from "../utils/authSchemas";
import { readFromPath } from "../utils/guards";

export default function SignUpPage() {
  const { signUp } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  /** The same pattern as `LoginPage`. `async` lets Formik end `isSubmitting` by itself. */
  const formik = useFormik<SignUpFormValues>({
    initialValues: { username: "", email: "", password: "", confirmPassword: "" },
    validationSchema: signUpSchema,
    onSubmit: async ({ username, email }) => {
      signUp(username.trim(), email.trim());
      showToast("Account created ✓");
      navigate(readFromPath(location.state), { replace: true });
    },
  });

  /** A field's error, shown only after it has been visited. */
  const errorFor = (name: keyof SignUpFormValues) => (formik.touched[name] ? formik.errors[name] : undefined);

  return (
    <AuthCard title="Create an account">
      <form onSubmit={formik.handleSubmit} noValidate className="grid gap-2">
        <FormField id="username" label="Username" autoComplete="username" {...formik.getFieldProps("username")} error={errorFor("username")} />
        <FormField id="email" label="Email" type="email" autoComplete="email" {...formik.getFieldProps("email")} error={errorFor("email")} />
        <FormField id="password" label="Password" type="password" autoComplete="new-password" {...formik.getFieldProps("password")} error={errorFor("password")} />
        <FormField id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" {...formik.getFieldProps("confirmPassword")} error={errorFor("confirmPassword")} />
        <button type="submit" disabled={formik.isSubmitting} className={buttonStyles.primary}>
          Sign Up
        </button>
      </form>
      <p className="text-[13px] text-ink-soft">This is simulated. Only your username and email are kept, in this browser. The password is never saved.</p>
      <Link to="/login" state={location.state} className={authLinkStyles}>
        I already have an account
      </Link>
    </AuthCard>
  );
}
