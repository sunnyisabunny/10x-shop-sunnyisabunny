/**
 * NOTE: a dropdown on Checkout's Delivery step that fills the form from a saved address (BONUS).
 * Why it exists: typing the same address every time is the dullest part of ordering.
 * Connects to: `CheckoutForm` passes the list and `onPick`. It draws nothing until an address has been saved.
 */
import { useState } from "react";
import { addressKey, formatAddress } from "../../hooks/useAddresses";
import type { SavedAddress } from "../../types/order";
import { inputStyles, labelStyles } from "../ui/FormField";

interface AddressPickerProps {
  addresses: SavedAddress[];
  onPick: (address: SavedAddress) => void;
}

export default function AddressPicker({ addresses, onPick }: AddressPickerProps) {
  /**
   * The chosen option, kept like any other select's value. Snapping back to the prompt after each choice looked tidy,
   * but on Windows the arrow keys change a closed select one step at a time, so only the first address could be reached.
   */
  const [chosen, setChosen] = useState("");

  if (addresses.length === 0) {
    return null;
  }

  return (
    <label className={`${labelStyles} mb-2`}>
      Saved addresses
      <select
        value={chosen}
        onChange={(event) => {
          setChosen(event.target.value);
          // The prompt's value is "", and Number("") is 0, which would pick the first address by accident.
          const picked = event.target.value === "" ? undefined : addresses[Number(event.target.value)];
          if (picked !== undefined) {
            onPick(picked);
          }
        }}
        className={inputStyles}
      >
        <option value="">Choose a saved address</option>
        {addresses.map((address, index) => (
          <option key={addressKey(address)} value={index}>
            {formatAddress(address)}
          </option>
        ))}
      </select>
    </label>
  );
}
