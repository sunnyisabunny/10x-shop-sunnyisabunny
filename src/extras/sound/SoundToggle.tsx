/**
 * NOTE: the speaker button beside the theme switch, and the link between the shop and `SoundEngine`.
 * Why it exists: sound is off until someone asks for it. Nobody should be surprised by audio, and browsers block it
 * before a click anyway.
 * Connects to: `ExtrasHost` draws this. `createPortal` puts it inside the Header's nav without the Header knowing.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../context/ThemeContext";
import { StorageService } from "../../models/StorageService";
import { SoundEngine } from "./SoundEngine";

/** The choice is saved under its own key. "Clear local data" leaves it alone, like the theme. */
const soundStorage = new StorageService<boolean>("shop_sound", (value) => (typeof value === "boolean" ? value : null));

/** The engine lives outside React, so short sounds such as the item drop can use it from anywhere. */
let sharedEngine: SoundEngine | null = null;
let isSoundOn = false;

/** Plays a short sound if sound is on, and does nothing otherwise, so a caller never has to check. */
export function playSound(...args: Parameters<SoundEngine["play"]>): void {
  if (isSoundOn) {
    sharedEngine?.play(...args);
  }
}

/** The speaker icon: with waves when on, crossed out when off, so it doesn't rely on colour alone. */
function SpeakerIcon({ isOn }: { isOn: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor" />
      {isOn ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /> : <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />}
    </svg>
  );
}

export default function SoundToggle() {
  const { theme } = useTheme();

  /** What the visitor wants. A saved "on" can't play until their next click, because of the browser's rule. */
  const [isOn, setIsOn] = useState(() => soundStorage.get() ?? false);

  /** The real audio connection. A ref, because creating it must wait for a click and needs no redraw. */
  const contextRef = useRef<AudioContext | null>(null);

  /**
   * Creates the audio on first use and wakes it up afterwards. This must run inside a click: browsers leave audio
   * suspended if it starts any other way. iOS can also put it in an "interrupted" state, which `resume` clears too.
   */
  const wakeAudio = useCallback(() => {
    if (contextRef.current === null) {
      contextRef.current = new AudioContext();
      sharedEngine = new SoundEngine(contextRef.current);
    }
    if (contextRef.current.state !== "running") {
      void contextRef.current.resume();
    }
  }, []);

  // Follows the switch and the theme. `isSoundOn` is kept in step for `playSound`, which lives outside React. Once the
  // fade has finished, turning off also suspends the audio, so silence costs no processing. The cleanup cancels that
  // if the switch is pressed again first.
  useEffect(() => {
    isSoundOn = isOn;
    soundStorage.set(isOn);
    if (sharedEngine === null) {
      return;
    }
    sharedEngine.setTheme(theme);
    sharedEngine.setOn(isOn);
    if (isOn) {
      return;
    }
    const timer = setTimeout(() => void contextRef.current?.suspend(), 2500);
    return () => clearTimeout(timer);
  }, [isOn, theme]);

  // Someone who turned sound on during an earlier visit gets it back on their first click anywhere. The browser
  // won't allow it any sooner. The cleanup removes the listener, however the click turns out.
  useEffect(() => {
    if (!isOn || contextRef.current !== null) {
      return;
    }
    function startOnFirstClick() {
      wakeAudio();
      sharedEngine?.setTheme(theme);
      sharedEngine?.setOn(true);
    }
    window.addEventListener("pointerdown", startOnFirstClick, { once: true });
    window.addEventListener("keydown", startOnFirstClick, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startOnFirstClick);
      window.removeEventListener("keydown", startOnFirstClick);
    };
  }, [isOn, theme, wakeAudio]);

  // The shop goes quiet in a background tab, so it doesn't follow people around. Suspending also saves battery.
  useEffect(() => {
    function handleVisibility() {
      if (contextRef.current === null || !isOn) {
        return;
      }
      void (document.hidden ? contextRef.current.suspend() : contextRef.current.resume());
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isOn]);

  /** The button's click, which is what makes audio allowed to start. */
  function handleClick() {
    wakeAudio();
    setIsOn((current) => !current);
  }

  const nav = document.getElementById("main-nav");
  if (nav === null) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isOn}
      aria-label="Background sound"
      title={isOn ? "Sound is on" : "Sound is off"}
      className="inline-flex size-11 items-center justify-center rounded-md text-ink-soft transition-colors duration-150 hocus:bg-steel-raised hocus:text-ink aria-pressed:text-ink"
    >
      <SpeakerIcon isOn={isOn} />
    </button>,
    nav,
  );
}
