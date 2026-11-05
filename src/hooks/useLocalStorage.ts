/**
 * NOTE: like useState, but the value is also saved in localStorage (PRD T3).
 * Why it exists: reviews, orders and profiles all need "state that survives a reload", so that logic is
 * written once.
 * Connects to: `StorageService` does the actual reading and writing, safely.
 *
 * `<T>` is a generic: the same hook holds reviews, orders or anything else. The return type is a tuple, the
 * same shape useState gives, plus a third item that deletes the saved value.
 */
import { useCallback, useEffect, useState } from "react";
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

  /**
   * Saves, and updates the screen only if saving worked, then returns whether it did. Doing it in the other
   * order kept a failed order in memory, so trying again saved it twice. See DEBUG-LOG.md.
   */
  const save = useCallback(
    (next: T): boolean => {
      const saved = storage.set(next);
      if (saved) {
        setValue(next);
      }
      return saved;
    },
    [storage],
  );

  /** Deletes the saved value and puts the screen back to the start, so the two can't disagree. */
  const remove = useCallback(() => {
    setValue(startingValue);
    storage.remove();
  }, [storage, startingValue]);

  /**
   * Follows changes made in other tabs. The browser fires `storage` only in the tabs that did NOT make the
   * change. Without this, a tab keeps its old copy and its next save writes over what the other tab added.
   * `event.key` is null when all of storage was cleared. The cleanup removes the listener, or every page visit
   * would leave another one running.
   */
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === key || event.key === null) {
        setValue(storage.get() ?? startingValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, storage, startingValue]);

  return [value, save, remove];
}
