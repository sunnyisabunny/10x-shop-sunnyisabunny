/**
 * NOTE: like useState, but the value is also saved in localStorage (PRD T3).
 * Why it exists: reviews, orders and addresses all need "state that survives a reload", so that logic is
 * written once.
 * Connects to: `StorageService` does the actual reading and writing, safely.
 *
 * `<T>` is a generic: the same hook holds reviews, orders or anything else. The return type is a tuple, the
 * same shape useState gives, plus a third item that deletes the saved value.
 */
import { useCallback, useState } from "react";
import { StorageService } from "../models/StorageService";

export function useLocalStorage<T>(key: string, initial: T, parse: (value: unknown) => T | null): [T, (value: T) => boolean, () => void] {
  /**
   * A useState initialiser runs only on the first render, so the service is created once and kept. The second
   * useState reads the saved value once, too: reading storage on every render would be wasted work.
   */
  const [storage] = useState(() => new StorageService<T>(key, parse));
  const [value, setValue] = useState<T>(() => storage.get() ?? initial);

  /** The starting value, kept from the first render. Callers pass a new `[]` each time, which would change `remove`. */
  const [startingValue] = useState(() => initial);

  /** Updates the screen and saves. It returns whether saving worked, so a caller can tell the user if not. */
  const save = useCallback(
    (next: T): boolean => {
      setValue(next);
      return storage.set(next);
    },
    [storage],
  );

  /** Deletes the saved value and puts the screen back to the start, so the two can't disagree. */
  const remove = useCallback(() => {
    setValue(startingValue);
    storage.remove();
  }, [storage, startingValue]);

  return [value, save, remove];
}
