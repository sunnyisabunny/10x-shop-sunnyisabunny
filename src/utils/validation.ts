/**
 * NOTE: the form rules, as plain functions that take values and return errors.
 * Why it exists: keeping rules out of the components makes them easy to read and to test, and the error
 * texts must match the PRD word for word, so they live in one place.
 * Connects to: `pages/LoginPage.tsx` now, and the Checkout form next.
 */
import type { LoginFormValues } from "../types/user";
import { MIN_PASSWORD_LENGTH } from "./constants";

/**
 * A possible error message per field of any form. For a form with fields `username` and `password`
 * this becomes `{ username?: string; password?: string }`. Generic, so every form can reuse it.
 */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** True when validation found nothing. An empty object means every field passed. */
export function hasNoErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length === 0;
}

/** PRD P1.2. The username is trimmed first, so a name of only spaces doesn't count. */
export function validateLogin(values: LoginFormValues): FieldErrors<LoginFormValues> {
  const errors: FieldErrors<LoginFormValues> = {};

  if (values.username.trim() === "") {
    errors.username = "Username is required";
  }

  if (values.password === "") {
    errors.password = "Password is required";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return errors;
}
