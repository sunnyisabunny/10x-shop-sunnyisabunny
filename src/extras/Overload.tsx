/**
 * NOTE: the easter egg. Typing 1, 0, X anywhere overloads the machine for a moment (beyond the spec).
 * Why it exists: the shop's name is a dare, and somebody will try it. Nothing depends on this and nothing is told about it.
 * Connects to: `ExtrasHost` draws this. `extras.css` does the rest, once `is-overloaded` is on the machine.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../context/ToastContext";
import { isForSomethingElse, printedKey } from "./keys";
import { playSound } from "./sound/SoundToggle";

/** What to type. */
const SECRET = "10X";

/** How long the overload lasts. It matches the animations in `extras.css`. */
const OVERLOAD_MS = 1800;

export default function Overload() {
  const { showToast } = useToast();

  /** Whether the machine is overloaded right now. */
  const [isOn, setIsOn] = useState(false);

  /** The last few keys. A ref, because typing needs no redraw until the secret is complete. */
  const typed = useRef("");

  // Listens for the secret anywhere on the site. Keys with no printed character, such as Shift, are skipped, so holding
  // Shift for the X still counts. The cleanup removes the listener if the extras ever go away.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const key = printedKey(event);
      if (key === null || isForSomethingElse(event)) {
        return;
      }
      typed.current = (typed.current + key).slice(-SECRET.length);
      if (typed.current === SECRET) {
        typed.current = "";
        setIsOn(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Runs the overload, then cleans up. A class on the machine is what lets the CSS reach everything inside it, without any
  // of those parts knowing. The cleanup removes it, so the machine can't stay stuck like this if the page changes.
  useEffect(() => {
    if (!isOn) {
      return;
    }
    const machine = document.getElementById("machine");
    machine?.classList.add("is-overloaded");
    playSound("overload");
    const timer = window.setTimeout(() => {
      setIsOn(false);
      showToast("Overload cleared. Please don't do that again.");
    }, OVERLOAD_MS);
    return () => {
      window.clearTimeout(timer);
      machine?.classList.remove("is-overloaded");
    };
  }, [isOn, showToast]);

  if (!isOn) {
    return null;
  }

  return createPortal(
    <div aria-hidden="true" className="overload-flash">
      10X
    </div>,
    document.body,
  );
}
