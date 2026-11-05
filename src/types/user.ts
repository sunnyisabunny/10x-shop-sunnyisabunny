/**
 * NOTE: the types for the simulated login.
 * Why it exists: login is local, as the PRD requires, so there is no token or server user. Just a name.
 * Connects to: `context/AuthContext.tsx` and `pages/LoginPage.tsx`.
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
