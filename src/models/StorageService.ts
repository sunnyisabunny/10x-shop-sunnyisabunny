/**
 * NOTE: the only door to localStorage in the whole app (PRD T4).
 * Why it exists: reading can fail on broken JSON, writing can fail when storage is full or blocked, and saved
 * data can be edited by hand. Handling all of that once, here, means no feature can forget it.
 * Connects to: `CartContext` now, then orders, reviews and the rest.
 *
 * OOP shown here: `<T>` makes it a generic class, so one implementation works for every kind of saved data.
 * Each instance knows its own key and how to check its own data.
 */
export class StorageService<T> {
  /**
   * @param key where the data lives in localStorage.
   * @param parse checks data read from storage and returns the usable part, or null if it can't be used.
   * JSON has no types, so `unknown` forces this check. An `as T` cast would only silence the compiler.
   */
  constructor(
    private readonly key: string,
    private readonly parse: (value: unknown) => T | null,
  ) {}

  /** Returns the saved value, or null if there is none, or if it is broken or blocked. It never throws. */
  get(): T | null {
    try {
      const raw = localStorage.getItem(this.key);
      return raw === null ? null : this.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Saves the value and returns whether it worked, so a caller that needs to know can tell the user. */
  set(value: T): boolean {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /** Deletes the value. Blocked storage has nothing to delete, so a failure here doesn't matter. */
  remove(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      return;
    }
  }
}
