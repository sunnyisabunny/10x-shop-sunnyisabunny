/**
 * NOTE: unit tests for `src/models/StorageService.ts`, the only code that touches localStorage.
 * Why it exists: storage can hold broken data or refuse to save, and the shop must survive both. DEBUG-LOG 4 was the
 * whole shop crashing when saving failed, and these tests make sure that can't come back.
 * Connects to: `src/models/StorageService.ts`. The tests swap in a fake localStorage, because Node versions differ on
 * whether they have one, and a fake can be made to fail on purpose.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageService } from "@/models/StorageService";

/** A localStorage stand-in. `failWrites` makes saving throw, as a full or blocked browser storage does. */
function fakeStorage(failWrites = false) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) {
        throw new Error("QuotaExceededError");
      }
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

/** Accepts only a whole number, as the real services accept only their own shape. */
const parseCount = (value: unknown): number | null => (Number.isInteger(value) ? (value as number) : null);

describe("StorageService", () => {
  let storage = fakeStorage();

  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gives null when nothing is saved", () => {
    expect(new StorageService("count", parseCount).get()).toBeNull();
  });

  it("saves and reads back a value", () => {
    const service = new StorageService("count", parseCount);
    expect(service.set(3)).toBe(true);
    expect(storage.data.get("count")).toBe("3");
    expect(service.get()).toBe(3);
  });

  it("gives null instead of crashing on broken or wrong-shaped data", () => {
    storage.data.set("count", "{not json");
    expect(new StorageService("count", parseCount).get()).toBeNull();
    storage.data.set("count", JSON.stringify("three"));
    expect(new StorageService("count", parseCount).get()).toBeNull();
  });

  it("returns false instead of throwing when the browser refuses to save", () => {
    vi.stubGlobal("localStorage", fakeStorage(true));
    expect(new StorageService("count", parseCount).set(3)).toBe(false);
  });

  it("removes the saved value", () => {
    const service = new StorageService("count", parseCount);
    service.set(3);
    service.remove();
    expect(service.get()).toBeNull();
  });
});
