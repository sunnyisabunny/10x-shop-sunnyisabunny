/**
 * NOTE: type guards: functions that check something's real shape while the app runs.
 * Why it exists: TypeScript's types vanish when the code runs. Values from `catch`, storage or router state
 * could be anything, so `unknown` makes us prove what they are first. `value is X` as the return type tells
 * TypeScript to treat the value as X whenever the guard returned true.
 * Using a guard instead of an `as` cast matters: `as` only silences the compiler, a guard really checks.
 * Connects to: `useFetch` here, and the storage layer later.
 */
import { ApiError } from "../api/ApiError";

/** True for errors from our ApiClient, which carry an HTTP status. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
