/**
 * NOTE: TEMPORARY. A panel of buttons for judging each sound by ear, shown only with `?soundtest` in the address.
 * It is removed before this branch is merged, once the sounds have been approved.
 */
import { playSound } from "./SoundToggle";
import type { SoundName } from "./SoundEngine";

const NAMES: SoundName[] = ["bell", "train", "car", "chime", "gull", "boat", "drop", "rattle", "print", "key", "overload"];

export default function SoundTestPanel() {
  if (!new URLSearchParams(window.location.search).has("soundtest")) {
    return null;
  }
  return (
    <div className="fixed right-3 bottom-3 z-50 grid max-w-[220px] grid-cols-2 gap-1 rounded-md bg-led-panel p-2 text-[13px] text-led shadow-[0_0_0_1px_var(--color-led)]">
      <p className="col-span-2">Press the speaker first, then:</p>
      {NAMES.map((name) => (
        <button key={name} type="button" onClick={() => playSound(name)} className="min-h-9 rounded bg-steel-raised px-2 text-ink">
          {name}
        </button>
      ))}
    </div>
  );
}
