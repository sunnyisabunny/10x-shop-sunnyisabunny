/**
 * NOTE: the rules for Login, Sign Up and password reset, written as Yup schemas (PRD P1, FULL).
 * Why it exists: a schema describes what valid data looks like, and Formik runs it for us. The other forms keep
 * their plain functions in `validation.ts`. This is a separate file so that Yup only downloads with these pages.
 * Connects to: `LoginPage`, `SignUpPage` and `ResetPasswordPage` pass these to `useFormik` as `validationSchema`.
 *
 * Writing `ObjectSchema<LoginFormValues>` makes TypeScript check the schema against the form's type, so adding a
 * field to one but not the other doesn't compile.
 *
 * `.required()` catches an empty field first: Formik turns "" into undefined before validating, and `.min()` skips
 * undefined. So an empty password shows "Password is required" and not the length message.
 */
import { object, ref, string, type ObjectSchema } from "yup";
import type { LoginFormValues, ResetPasswordValues, SignUpFormValues } from "@/types/user";
import { MIN_PASSWORD_LENGTH } from "./constants";
import { EMAIL_PATTERN } from "./validation";

const EMAIL_MESSAGE = "Please enter a valid email address";
const PASSWORD_LENGTH_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;

/** PRD P1.2. `.trim()` cleans the text before the check, so a username of only spaces doesn't count. */
export const loginSchema: ObjectSchema<LoginFormValues> = object({
  username: string().trim().required("Username is required"),
  password: string().required("Password is required").min(MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_MESSAGE),
});

/** Our own rules (`PLAN.md`), because the annex names Sign Up but gives no fields. `ref` compares two fields. */
export const signUpSchema: ObjectSchema<SignUpFormValues> = object({
  username: string().trim().required("Username is required"),
  email: string().trim().required(EMAIL_MESSAGE).matches(EMAIL_PATTERN, EMAIL_MESSAGE),
  password: string().required("Password is required").min(MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_MESSAGE),
  confirmPassword: string()
    .required("Please confirm your password")
    .oneOf([ref("password")], "Passwords do not match"),
});

/** Our own rule (`PLAN.md`): only an email is asked for. */
export const resetPasswordSchema: ObjectSchema<ResetPasswordValues> = object({
  email: string().trim().required(EMAIL_MESSAGE).matches(EMAIL_PATTERN, EMAIL_MESSAGE),
});
