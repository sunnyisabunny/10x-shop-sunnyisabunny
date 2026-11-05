/**
 * NOTE: like useState, but the value is also saved in localStorage (PRD T3).
 * Why it exists: reviews, orders and addresses all need "state that survives a reload", so that logic is
 * written once.
 * Connects to: `StorageService` does the actual reading and writing, safely.
 *
 * `<T>` is a generic: the same hook holds reviews, orders or anything else. The return type is a tuple, the
 * same shape useState gives, so it reads the same at the call site.
 */
import { useCallback, useState } from "react";
import { StorageService } from "../models/StorageService";

export function useLocalStorage<T>(key: string, initial: T, parse: (value: unknown) => T | null): [T, (value: T) => boolean] {
  /**
   * A useState initialiser runs only on the first render, so the service is created once and kept. The second
   * useState reads the saved value once, too: reading storage on every render would be wasted work.
   */
  const [storage] = useState(() => new StorageService<T>(key, parse));
  const [value, setValue] = useState<T>(() => storage.get() ?? initial);

  /** Updates the screen and saves. It returns whether saving worked, so a caller can tell the user if not. */
  const save = useCallback(
    (next: T): boolean => {
      setValue(next);
      return storage.set(next);
    },
    [storage],
  );

  return [value, save];
}
