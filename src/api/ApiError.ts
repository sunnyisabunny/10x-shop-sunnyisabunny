/**
 * NOTE: an error that remembers its HTTP status.
 * Why it exists: a plain Error only holds text, but the app reacts differently to different failures. A 404
 * shows the NotFound page, and anything else shows a message with Retry.
 * Connects to: `ApiClient` throws these, and `useFetch` reads the status.
 *
 * OOP shown here: `extends Error` is inheritance, so this still works everywhere an Error does.
 * `public readonly status` in the constructor both declares the field and stores the argument.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
