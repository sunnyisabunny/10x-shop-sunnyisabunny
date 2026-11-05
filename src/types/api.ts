/**
 * NOTE: the one shape for any data that loads over time.
 * Why it exists: three separate useStates (data, loading, error) allow impossible combinations, such as
 * loading and error at the same time. With this union only one state can exist at a time, and TypeScript
 * only lets you read `data` after checking the status is "success".
 * Connects to: `hooks/useFetch.ts` produces these, and pages read them.
 *
 * This is a "discriminated union": the literal `status` field tells TypeScript which variant it has.
 * `<T>` is a generic: the same shape works for a Product, a ProductsResponse or anything else.
 */
export type AsyncState<T> =
  /** Nothing to load, such as when the URL held an invalid product id. */
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  /** `httpStatus` lets a page treat a 404 as "not found" and everything else as "try again". */
  | { status: "error"; message: string; httpStatus?: number };
