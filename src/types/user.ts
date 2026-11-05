/**
 * NOTE: the types for the simulated login and the user's profile.
 * Why it exists: login is local, as the PRD requires, so there is no token or server user. Just a name.
 * Connects to: `context/AuthContext.tsx`, the Login, Sign Up and Reset pages, and `pages/ProfilePage.tsx`.
 */

/** Who is using the shop right now. A guest is `null` in AuthContext, so this always means logged in. */
export interface AuthUser {
  username: string;
}

/** The Login form's two controlled inputs. */
export interface LoginFormValues {
  username: string;
  password: string;
}

/** The Sign Up form. `Login` plus two more fields, so `extends` saves repeating them. */
export interface SignUpFormValues extends LoginFormValues {
  email: string;
  confirmPassword: string;
}

/** The password reset form. */
export interface ResetPasswordValues {
  email: string;
}

/** The details a user can edit on the Profile page. */
export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  /** Optional in the form, so it can be an empty string. */
  phone: string;
}

/** Saved profiles by username. `Record` describes an object used as a lookup table. */
export type StoredProfiles = Record<string, Profile>;
