/**
 * NOTE: the one place the extras are switched on. They are the fun features beyond the spec.
 * Why it exists: `Layout` loads this lazily, in a single tagged line, so the required shop never depends on any extra.
 * Dependencies run one way: extras may read the shop's contexts and hooks, and the shop never imports an extra.
 * Connects to: `Layout`, which wraps this in an ErrorBoundary, so a broken extra can't take the shop down.
 */
import "./extras.css";
import ItemDrop from "./ItemDrop";
import LedTicker from "./LedTicker";
import NightCat from "./NightCat";
import PickupTray from "./PickupTray";
import Scene from "./Scene";
import SoundTestPanel from "./sound/SoundTestPanel";
import SoundToggle from "./sound/SoundToggle";

export default function ExtrasHost() {
  return (
    <>
      <Scene />
      <LedTicker />
      <NightCat />
      <PickupTray />
      <ItemDrop />
      <SoundToggle />
      <SoundTestPanel />
    </>
  );
}
