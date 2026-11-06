/**
 * NOTE: the one class that talks to the network.
 * Why it exists: every request needs the same base URL, the same `response.ok` check, the same timeout and
 * the same error handling. Writing that once means no page can forget it.
 * Connects to: `hooks/useFetch.ts` and the catalog's data hook call `api.get`. `ApiError` is what it throws.
 *
 * OOP shown here: `private readonly` fields can't be read from outside or changed after construction, and
 * `request` is private shared logic behind the public `get`.
 *
 * Unlike the PRD's sample, this sends no `Content-Type` header. On a GET there is no body to describe, and
 * that header would make the browser send an extra OPTIONS "preflight" request before every call. There is
 * no `post` either, because this app never writes to the server.
 */
import { API_BASE_URL, API_TIMEOUT_MS } from "@/utils/constants";
import { ApiError } from "./ApiError";

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  /**
   * `<T>` is a generic: the caller says what shape it expects, as in `api.get<Product>(...)`, and gets that
   * type back. The `as T` below is the one place we trust the server, since JSON has no types at runtime.
   */
  private async request<T>(path: string, signal?: AbortSignal): Promise<T> {
    // Our own controller, so one request can be cancelled for two reasons: the timeout or the caller.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const cancelFromCaller = () => controller.abort();
    signal?.addEventListener("abort", cancelFromCaller);

    try {
      const response = await fetch(this.baseUrl + path, { signal: controller.signal });
      // fetch only rejects when the network fails. A 404 or 500 arrives here as a normal response.
      if (!response.ok) {
        throw new ApiError(response.status, `The server answered with status ${response.status}.`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError || signal?.aborted) {
        throw error;
      }
      // Our controller fired but the caller's didn't, so this was the timeout. Status 0 means "no answer".
      if (controller.signal.aborted) {
        throw new ApiError(0, "The server took too long to answer.");
      }
      throw new ApiError(0, "Could not reach the server. Check your connection.");
    } finally {
      // Runs on success and failure. Without it, the timer and listener would outlive the request.
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancelFromCaller);
    }
  }

  /** Gets JSON from `path`. Passing a `signal` lets the caller cancel the request. */
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, signal);
  }
}

/** The one instance the whole app shares. */
export const api = new ApiClient(API_BASE_URL, API_TIMEOUT_MS);
