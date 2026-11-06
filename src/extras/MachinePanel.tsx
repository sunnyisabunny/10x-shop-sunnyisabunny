/**
 * NOTE: the panel beside the catalog: a keypad that finds a product by its slot code, and a button to shake the machine (beyond the spec).
 * Why it exists: it is the most machine-like part of the machine. Typing C2 and watching the slot light up is the joke,
 * and it also works as a real shortcut, since the found product's link gets keyboard focus.
 * Connects to: `ExtrasHost` draws this into `machine-side`, which `CatalogPage` sets aside. It reads the slot codes that
 * `ProductCard` already writes into the page as `data-slot`, so the cards don't know this exists.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../components/ui/Button";
import { useToast } from "../context/ToastContext";
import { isForSomethingElse, printedKey } from "./keys";
import { playSound } from "./sound/SoundToggle";
import { useSlot } from "./useSlot";

/** The keys on the panel. The physical keyboard can reach further, because Endless goes past row C. */
const PANEL_KEYS = ["A", "B", "C", "1", "2", "3", "4"];

/** How long a found slot stays lit. */
const HIGHLIGHT_MS = 1800;

/** How long a half-typed code waits before clearing itself, so a stray key doesn't stay on the display. */
const FORGET_MS = 4000;

/** How long the machine shakes. It matches the animation in `extras.css`. */
const SHAKE_MS = 480;

/** A finished code: one or two letters for the row, then the position in that row. */
const FINISHED_CODE = /^[A-Z]{1,2}[1-4]$/;

/** What the code becomes after one more key. Letters build the row, and a number finishes it. A number on its own does nothing. */
function nextCode(code: string, key: string): string {
  if (/^[A-Z]$/.test(key)) {
    return /^[A-Z]$/.test(code) ? code + key : key;
  }
  return /^[1-4]$/.test(key) && /^[A-Z]{1,2}$/.test(code) ? code + key : code;
}

/** The title of a card, read from its link. */
function titleOf(card: HTMLElement): string {
  return card.querySelector("a[href^='/products/']")?.textContent ?? "";
}

export default function MachinePanel() {
  const slot = useSlot("machine-side");
  const { showToast } = useToast();

  /** What has been typed so far. */
  const [code, setCode] = useState("");

  /** The running timers. Refs, because a new press restarts them and they never need a redraw. */
  const forgetTimer = useRef<number | undefined>(undefined);
  const highlightTimer = useRef<number | undefined>(undefined);
  const shakeTimer = useRef<number | undefined>(undefined);

  /** The slot lit at the moment, so lighting another can put this one out. */
  const litCard = useRef<HTMLElement | null>(null);

  /** Lights a slot for a moment. An attribute and not a class, because React rewrites `className` on its next change. */
  const light = useCallback((card: HTMLElement) => {
    litCard.current?.removeAttribute("data-hit");
    window.clearTimeout(highlightTimer.current);
    card.setAttribute("data-hit", "");
    litCard.current = card;
    highlightTimer.current = window.setTimeout(() => card.removeAttribute("data-hit"), HIGHLIGHT_MS);
  }, []);

  /**
   * Finds the slot for a finished code. Focus goes to its link, so pressing Enter next opens the product. A finished code
   * can only be letters and one number, as checked above, so it is safe inside this selector.
   */
  const findSlot = useCallback(
    (finished: string) => {
      const card = document.querySelector<HTMLElement>(`[data-slot="${finished}"]`);
      if (card === null) {
        showToast(`No slot ${finished}. The machine checked.`);
        return;
      }
      light(card);
      card.querySelector<HTMLElement>("a[href^='/products/']")?.focus({ preventScroll: true });
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      card.scrollIntoView({ block: "center", behavior });
      showToast(titleOf(card));
    },
    [light, showToast],
  );

  /** One key press, from the panel or the keyboard. A finished code does its work inside the event, not in a later effect. */
  const press = useCallback(
    (key: string) => {
      const next = nextCode(code, key);
      if (next === code) {
        return;
      }
      playSound("key");
      setCode(next);
      if (FINISHED_CODE.test(next)) {
        findSlot(next);
      }
    },
    [code, findSlot],
  );

  // Clears the display a moment after the last key, whether the code finished or not.
  useEffect(() => {
    if (code === "") {
      return;
    }
    forgetTimer.current = window.setTimeout(() => setCode(""), FINISHED_CODE.test(code) ? HIGHLIGHT_MS : FORGET_MS);
    return () => window.clearTimeout(forgetTimer.current);
  }, [code]);

  // The real keyboard works too, but only while the panel can be seen, so these keys do nothing elsewhere. Its place stays
  // on the page on narrower screens, only hidden, and a width of 0 is how that shows. The cleanup removes the listener when
  // the panel goes away, or every visit to the catalog would add another one.
  useEffect(() => {
    if (slot === null) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (isForSomethingElse(event) || slot.offsetWidth === 0) {
        return;
      }
      if (event.key === "Escape") {
        setCode("");
        return;
      }
      const key = printedKey(event);
      if (key !== null) {
        press(key);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [slot, press]);

  // Stops the timers when this goes away, and puts out any lit slot.
  useEffect(
    () => () => {
      window.clearTimeout(highlightTimer.current);
      window.clearTimeout(shakeTimer.current);
      litCard.current?.removeAttribute("data-hit");
      document.getElementById("machine")?.classList.remove("is-shaking");
    },
    [],
  );

  /**
   * Shakes the machine, and something rattles. Nothing goes into the cart, because a shop that adds things you didn't ask
   * for is the opposite of what this one is for. Only slots in stock can rattle, and a dark bay marks an empty one.
   */
  function handleShake() {
    const machine = document.getElementById("machine");
    machine?.classList.add("is-shaking");
    window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => machine?.classList.remove("is-shaking"), SHAKE_MS);
    playSound("rattle");

    const stocked = [...document.querySelectorAll<HTMLElement>("[data-slot]")].filter((card) => card.querySelector(".dim-glass") === null);
    const card = stocked[Math.floor(Math.random() * stocked.length)];
    if (card === undefined) {
      showToast("Nothing rattled. The machine is empty.");
      return;
    }
    light(card);
    showToast(`Something rattled: ${titleOf(card)}. It stayed where it was.`);
  }

  if (slot === null) {
    return null;
  }

  return createPortal(
    <div role="group" aria-label="Machine controls" className="machine-panel">
      {/* `aria-live`, so a screen reader hears each key as it lands. */}
      <div aria-live="polite" className="machine-panel-led">
        {code === "" ? "--" : code.padEnd(2, "-")}
      </div>
      <p className="machine-panel-note">Type a slot code</p>
      <div className="machine-panel-keys">
        {PANEL_KEYS.map((key) => (
          <button key={key} type="button" aria-label={`Key ${key}`} onClick={() => press(key)}>
            {key}
          </button>
        ))}
        <button type="button" aria-label="Clear the code" onClick={() => setCode("")} className="machine-panel-clear">
          Clear
        </button>
      </div>
      {/* "Cold": the label on real Japanese drinks machines. Decoration only. */}
      <div aria-hidden="true" lang="ja" className="machine-panel-cold">
        つめた〜い
      </div>
      <Button variant="quiet" onClick={handleShake} className="w-full">
        Shake the machine
      </Button>
      <p className="machine-panel-note">Not recommended.</p>
    </div>,
    slot,
  );
}
