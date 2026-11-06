/**
 * NOTE: the delivery addresses saved in this browser (BONUS).
 * Why it exists: Checkout adds them and offers them, and Profile lists and removes them, so that logic is written once.
 * Connects to: `useLocalStorage` saves them under `shop_addresses`. "Clear local data" on Profile empties them.
 */
import { useCallback } from "react";
import type { SavedAddress } from "@/types/order";
import { STORAGE_KEYS } from "@/utils/constants";
import { addressKey, parseAddresses } from "@/utils/guards";
import { useLocalStorage } from "./useLocalStorage";

export { addressKey };

/** How an address reads on one line. */
export function formatAddress({ address, city, postalCode, country }: SavedAddress): string {
  return `${address}, ${city} ${postalCode}, ${country}`;
}

/** What `useAddresses` gives back. */
export interface UseAddressesResult {
  addresses: SavedAddress[];
  /** Saves an address, newest first. An address already saved just moves to the top. Returns whether saving worked. */
  addAddress: (address: SavedAddress) => boolean;
  /** Returns whether saving the shorter list worked. */
  removeAddress: (address: SavedAddress) => boolean;
  clearAddresses: () => void;
}

/** Reads the saved addresses and changes them. */
export function useAddresses(): UseAddressesResult {
  const [addresses, save, clearAddresses] = useLocalStorage<SavedAddress[]>(STORAGE_KEYS.addresses, [], parseAddresses);

  const removeAddress = useCallback(
    (address: SavedAddress) => save(addresses.filter((saved) => addressKey(saved) !== addressKey(address))),
    [addresses, save],
  );

  const addAddress = useCallback(
    (address: SavedAddress) => save([address, ...addresses.filter((saved) => addressKey(saved) !== addressKey(address))]),
    [addresses, save],
  );

  return { addresses, addAddress, removeAddress, clearAddresses };
}
