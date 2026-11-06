/**
 * NOTE: a dropdown on Checkout's Delivery step that fills the form from a saved address (BONUS).
 * Why it exists: typing the same address every time is the dullest part of ordering.
 * Connects to: `CheckoutForm` passes the list and `onPick`. It draws nothing until an address has been saved.
 */
import { formatAddress } from "../../hooks/useAddresses";
import type { SavedAddress } from "../../types/order";
import { inputStyles, labelStyles } from "../ui/FormField";

interface AddressPickerProps {
  addresses: SavedAddress[];
  onPick: (address: SavedAddress) => void;
}

export default function AddressPicker({ addresses, onPick }: AddressPickerProps) {
  if (addresses.length === 0) {
    return null;
  }

  return (
    <label className={`${labelStyles} mb-2`}>
      Saved addresses
      {/* value="" keeps this showing its prompt. It is an action, not a setting, and the fields below hold the result. */}
      <select
        value=""
        onChange={(event) => {
          const picked = addresses[Number(event.target.value)];
          if (picked !== undefined) {
            onPick(picked);
          }
        }}
        className={inputStyles}
      >
        <option value="">Choose a saved address</option>
        {addresses.map((address, index) => (
          <option key={formatAddress(address)} value={index}>
            {formatAddress(address)}
          </option>
        ))}
      </select>
    </label>
  );
}
