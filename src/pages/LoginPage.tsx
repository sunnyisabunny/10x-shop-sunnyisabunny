/**
 * NOTE: the Login page: a controlled form that logs the user in locally (PRD P1).
 * Why it exists: Checkout needs a logged-in user, and the PRD wants this form's React mechanics visible:
 * value and onChange on every input, onSubmit with preventDefault, and errors kept in state.
 * Connects to: `AuthContext` (login), `validation.ts` (rules), `ProtectedRoute` (sends `from`).
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { buttonStyles } from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useAuth } from "../context/AuthContext";
import type { LoginFormValues } from "../types/user";
import { MIN_PASSWORD_LENGTH } from "../utils/constants";
import { hasNoErrors, validateLogin, type FieldErrors } from "../utils/validation";

/**
 * Reads where to go after login. `location.state` has the type `any`, so this type guard checks its
 * real shape at runtime instead of trusting it. Anything unexpected falls back to the catalog.
 */
function readFromPath(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state && typeof state.from === "string") {
    return state.from;
  }
  return "/";
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /** What is typed in the two inputs. This being in state is what "controlled form" means. */
  const [values, setValues] = useState<LoginFormValues>({ username: "", password: "" });

  /** The current error per field, shown under each input. */
  const [errors, setErrors] = useState<FieldErrors<LoginFormValues>>({});

  /**
   * One handler for both inputs: the input's `name` says which field to update. It copies the old
   * object with `...` and changes one key, because React only notices a new object, not a changed one.
   */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  /**
   * Runs on submit. `preventDefault` stops the browser's default form behaviour, which would reload the
   * page and wipe all React state. Only a valid form logs in, and the password goes no further than here.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (hasNoErrors(nextErrors)) {
      login(values.username.trim());
      navigate(readFromPath(location.state), { replace: true });
    }
  }

  return (
    <section className="flex justify-center p-3.5 tablet:p-6">
      <div className="grid w-full max-w-[420px] gap-4 rounded-[10px] bg-steel-raised p-5 shadow-[inset_0_0_0_1px_var(--edge)]">
        <h1 className="text-3xl leading-tight font-bold">Log in</h1>
        {/* noValidate turns off the browser's own popups, so our exact error texts are the ones shown. */}
        <form onSubmit={handleSubmit} noValidate className="grid gap-3.5">
          <FormField
            id="username"
            name="username"
            label="Username"
            autoComplete="username"
            value={values.username}
            onChange={handleChange}
            error={errors.username}
          />
          <FormField
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
          />
          <button type="submit" className={buttonStyles.primary}>
            Log In
          </button>
        </form>
        <p className="text-[13px] text-ink-soft">
          This login is simulated. Any username works, with a password of at least {MIN_PASSWORD_LENGTH} characters.
        </p>
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-ink-soft hover:text-ink hover:underline">
          ← Back to catalog
        </Link>
      </div>
    </section>
  );
}
