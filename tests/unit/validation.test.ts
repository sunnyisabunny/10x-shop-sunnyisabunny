/**
 * NOTE: unit tests for the form rules: Checkout and Profile in `src/utils/validation.ts`, and Login, Sign Up and
 * password reset in `src/utils/authSchemas.ts`.
 * Why it exists: the PRD gives the error messages word for word, so these tests check the exact text as well as when
 * it appears. Lengths come from `src/utils/constants.ts`, so a live change to them can't break the tests.
 */
import { describe, expect, it } from "vitest";
import { ValidationError, type AnyObjectSchema } from "yup";
import type { ShippingInfo } from "@/types/order";
import { loginSchema, resetPasswordSchema, signUpSchema } from "@/utils/authSchemas";
import { MIN_ADDRESS_LENGTH, MIN_FULL_NAME_LENGTH, MIN_NAME_LENGTH, MIN_PASSWORD_LENGTH } from "@/utils/constants";
import { hasNoErrors, validateCheckout, validateProfile } from "@/utils/validation";

/** A delivery form that passes every rule. */
const GOOD: ShippingInfo = {
  fullName: "Ana Test",
  email: "ana@example.com",
  phone: "+995 555 12 34 56",
  address: "1 Rustaveli Ave",
  city: "Tbilisi",
  postalCode: "0108",
  country: "Georgia",
};

/** Runs a schema the way a form submit does, and returns every message it gives. */
function errorsOf(schema: AnyObjectSchema, values: unknown): string[] {
  try {
    schema.validateSync(values, { abortEarly: false });
    return [];
  } catch (error) {
    return error instanceof ValidationError ? error.errors : ["unexpected error"];
  }
}

describe("validateCheckout", () => {
  it("finds nothing wrong with a good form", () => {
    expect(hasNoErrors(validateCheckout(GOOD))).toBe(true);
  });

  it("gives the PRD's exact message for every empty field", () => {
    const empty = { fullName: "", email: "", phone: "", address: "", city: "", postalCode: "", country: "" };
    expect(validateCheckout(empty)).toEqual({
      fullName: `Full name must be at least ${MIN_FULL_NAME_LENGTH} characters`,
      email: "Please enter a valid email address",
      phone: "Please enter a valid phone number",
      address: `Address must be at least ${MIN_ADDRESS_LENGTH} characters`,
      city: "City is required",
      postalCode: "Postal code must be 4-10 digits",
      country: "Please select a country",
    });
  });

  it("doesn't count spaces as filling a field in", () => {
    expect(validateCheckout({ ...GOOD, city: "   " }).city).toBe("City is required");
  });

  it("checks the postal code is 4 to 10 digits", () => {
    expect(validateCheckout({ ...GOOD, postalCode: "123" }).postalCode).toBeDefined();
    expect(validateCheckout({ ...GOOD, postalCode: "12ab" }).postalCode).toBeDefined();
    expect(validateCheckout({ ...GOOD, postalCode: "0108" }).postalCode).toBeUndefined();
  });
});

describe("validateProfile", () => {
  const profile = { firstName: "Ana", lastName: "Test", email: "ana@example.com", phone: "" };

  it("treats the phone as optional, but checks it once something is typed", () => {
    expect(validateProfile(profile).phone).toBeUndefined();
    expect(validateProfile({ ...profile, phone: "abc" }).phone).toBe("Please enter a valid phone number");
  });

  it("asks for names of at least the minimum length", () => {
    const errors = validateProfile({ ...profile, firstName: "A", lastName: "" });
    expect(errors.firstName).toBe(`First name must be at least ${MIN_NAME_LENGTH} characters`);
    expect(errors.lastName).toBe(`Last name must be at least ${MIN_NAME_LENGTH} characters`);
  });
});

describe("login, sign up and reset rules", () => {
  // Formik turns an empty field into undefined before validating, so a missing field here is an empty one there.
  it("Login asks for both fields when they're empty, without the length message", () => {
    const errors = errorsOf(loginSchema, {});
    expect(errors).toEqual(expect.arrayContaining(["Username is required", "Password is required"]));
    expect(errors).not.toContain(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  });

  it("Login rejects a password one character too short, and accepts the minimum", () => {
    const short = "x".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(errorsOf(loginSchema, { username: "ana", password: short })).toEqual([`Password must be at least ${MIN_PASSWORD_LENGTH} characters`]);
    expect(errorsOf(loginSchema, { username: "ana", password: "x".repeat(MIN_PASSWORD_LENGTH) })).toEqual([]);
  });

  it("Sign Up checks that the two passwords match", () => {
    const password = "x".repeat(MIN_PASSWORD_LENGTH);
    const errors = errorsOf(signUpSchema, { username: "ana", email: "ana@example.com", password, confirmPassword: `${password}y` });
    expect(errors).toEqual(["Passwords do not match"]);
  });

  it("Reset only needs a valid email", () => {
    expect(errorsOf(resetPasswordSchema, { email: "ana@" })).toEqual(["Please enter a valid email address"]);
    expect(errorsOf(resetPasswordSchema, { email: "ana@example.com" })).toEqual([]);
  });
});
