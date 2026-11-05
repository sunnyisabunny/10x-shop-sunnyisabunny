/**
 * NOTE: the simulated login and the user's profile, shared with the whole app through React Context.
 * Why it exists: the Header, the Checkout guard and the Login page all need to know who is logged in.
 * Passing that through props would mean threading it through every component in between ("prop drilling").
 * Connects to: `App.tsx` wraps the app in `AuthProvider`, and anything can then call `useAuth()`.
 *
 * This is NOT real authentication, and the PRD says it must not be: no server, no token, and the password
 * is never kept anywhere. In a browser-only app a real login is impossible, because anyone can edit
 * this state with developer tools.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { StorageService } from "../models/StorageService";
import type { AuthUser, Profile, StoredProfiles } from "../types/user";
import { STORAGE_KEYS } from "../utils/constants";
import { parseAuthUser, parseStoredProfiles } from "../utils/guards";

/** Everything components get from `useAuth()`. */
interface AuthContextValue {
  /** The logged-in user, or null for a guest. */
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** This user's saved profile, or null if they haven't saved one yet. */
  profile: Profile | null;
  /** The name to show: from the profile if it has one, otherwise the username. Null for a guest. */
  displayName: string | null;
  login: (username: string) => void;
  logout: () => void;
  /** Saves the profile. Returns false if storage refused, so the page can say so. */
  updateProfile: (profile: Profile) => boolean;
}

/** Starts as null so `useAuth` can notice when a component is used outside the provider. */
const AuthContext = createContext<AuthContextValue | null>(null);

/** Only the username is ever saved. There is no password to save, because login never keeps one. */
const userStorage = new StorageService<AuthUser>(STORAGE_KEYS.user, parseAuthUser);

export function AuthProvider({ children }: { children: ReactNode }) {
  /** Who is logged in. Restored from storage, so a reload on /orders doesn't send you back to Login. */
  const [user, setUser] = useState<AuthUser | null>(() => userStorage.get());

  /** Everyone's saved profiles, by username, so logging out and back in keeps your details. */
  const [profiles, saveProfiles] = useLocalStorage<StoredProfiles>(STORAGE_KEYS.profiles, {}, parseStoredProfiles);

  // Saves the login whenever it changes. Logging out removes it.
  useEffect(() => {
    if (user === null) {
      userStorage.remove();
    } else {
      userStorage.set(user);
    }
  }, [user]);

  /** `useCallback` keeps the same function between renders, so memoised children don't redraw needlessly. */
  const login = useCallback((username: string) => setUser({ username }), []);
  const logout = useCallback(() => setUser(null), []);

  const username = user?.username ?? null;

  const updateProfile = useCallback(
    (profile: Profile) => username !== null && saveProfiles({ ...profiles, [username]: profile }),
    [username, profiles, saveProfiles],
  );

  /**
   * `useMemo` builds a new value only when something in it changes. Without it, every render of this provider
   * would create a new object, and every component using `useAuth` would redraw.
   *
   * `Object.hasOwn` matters because any username is allowed. Every plain object inherits `constructor`, so
   * `profiles["constructor"]` would find a function and treat it as a saved profile. See DEBUG-LOG.md.
   */
  const value = useMemo<AuthContextValue>(() => {
    const profile = username !== null && Object.hasOwn(profiles, username) ? profiles[username] : null;
    const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";
    return {
      user,
      isLoggedIn: user !== null,
      profile,
      displayName: fullName !== "" ? fullName : username,
      login,
      logout,
      updateProfile,
    };
  }, [user, username, profiles, login, logout, updateProfile]);

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
