/**
 * NOTE: the simulated login, shared with the whole app through React Context.
 * Why it exists: the Header, the Checkout guard and the Login page all need to know who is logged in.
 * Passing that through props would mean threading it through every component in between ("prop drilling").
 * Connects to: `App.tsx` wraps the app in `AuthProvider`, and anything can then call `useAuth()`.
 *
 * This is NOT real authentication, and the PRD says it must not be: no server, no token, and the password
 * is never kept anywhere. In a browser-only app a real login is impossible, because anyone can edit
 * this state with developer tools.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuthUser } from "../types/user";

/** Everything components get from `useAuth()`. */
interface AuthContextValue {
  /** The logged-in user, or null for a guest. */
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (username: string) => void;
  logout: () => void;
}

/** Starts as null so `useAuth` can notice when a component is used outside the provider. */
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * The one piece of state: who is logged in. A reload clears it, and the PRD allows that at CORE level.
   */
  const [user, setUser] = useState<AuthUser | null>(null);

  /** `useCallback` keeps the same function between renders, so memoised children don't redraw needlessly. */
  const login = useCallback((username: string) => setUser({ username }), []);
  const logout = useCallback(() => setUser(null), []);

  /**
   * `useMemo` builds a new value only when `user` changes. Without it, every render of this provider
   * would create a new object, and every component using `useAuth` would redraw.
   */
  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoggedIn: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * How components read the login state. Throwing here gives a clear message if the provider is missing,
 * and it means callers never have to handle `null`.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
