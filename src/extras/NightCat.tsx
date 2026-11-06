/**
 * NOTE: a pixel cat asleep on top of the machine. It wakes up when something is added to the cart (beyond the spec).
 * Why it exists: a small reward for adding something, which never gets in the way. It only appears at night, because it
 * is on the night shift, and by day the bonsai has the top of the cabinet.
 * Connects to: `ExtrasHost` draws this inside `#machine`. It only watches the cart's count, so the cart never knows about it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "../context/CartContext";
import { useSlot } from "./useSlot";

/** How long the cat stays awake before going back to sleep. */
const AWAKE_MS = 2600;

/** The drawing, as [x, y, width, height] blocks grouped by colour, on a 20 by 12.5 grid. */
const FUR = [[2, 1.5, 1, 1], [6, 1.5, 1, 1], [2, 2.5, 2, 1], [5, 2.5, 2, 1], [1, 3.5, 7, 1], [1, 4.5, 8, 1], [1, 5.5, 16, 1], [1, 6.5, 17, 1], [2, 7.5, 17, 1], [3, 8.5, 16, 1], [3, 9.5, 13, 2], [16, 10.5, 3, 1], [18, 9.5, 1, 1]];
const PATCHES = [[6, 1.5, 1, 2], [9, 5.5, 6, 1], [10, 6.5, 6, 1], [11, 7.5, 4, 1]];
const PAWS = [[4, 9.5, 1, 1], [7, 9.5, 1, 1]];

/** Draws one colour's blocks. The positions never change, so an index is a fine key. */
function Blocks({ blocks, fill }: { blocks: number[][]; fill: string }) {
  return (
    <g fill={fill}>
      {blocks.map(([x, y, width, height], index) => (
        <rect key={index} x={x} y={y} width={width} height={height} />
      ))}
    </g>
  );
}

export default function NightCat() {
  const machine = useSlot("machine");
  const { itemCount } = useCart();

  /** Whether the eyes are open. */
  const [isAwake, setIsAwake] = useState(false);

  /** The count last seen, so only a rise wakes the cat. Removing something from the cart doesn't. */
  const lastCount = useRef(itemCount);

  /** The running timer. A ref, so adding again can restart it, and other cart changes leave it alone. */
  const sleepTimer = useRef<number | undefined>(undefined);

  // Wakes when the count rises, and goes back to sleep once it has been left alone for a while.
  useEffect(() => {
    if (itemCount > lastCount.current) {
      setIsAwake(true);
      window.clearTimeout(sleepTimer.current);
      sleepTimer.current = window.setTimeout(() => setIsAwake(false), AWAKE_MS);
    }
    lastCount.current = itemCount;
  }, [itemCount]);

  // Stops the timer when this goes away, or it would try to update a component that no longer exists.
  useEffect(() => () => window.clearTimeout(sleepTimer.current), []);

  if (machine === null) {
    return null;
  }

  return createPortal(
    <div data-screen-only aria-hidden="true" className="night-cat" data-awake={isAwake}>
      {!isAwake && <span className="night-cat-zz">z</span>}
      <svg viewBox="0 0 20 12.5" width="80" height="50" shapeRendering="crispEdges">
        <Blocks blocks={FUR} fill="#d5dae3" />
        <Blocks blocks={PATCHES} fill="#f2a53c" />
        <Blocks blocks={PAWS} fill="#3b4252" />
        {/* Open eyes are tall and lit. Closed ones are a thin dark line. */}
        <g fill={isAwake ? "#ffb627" : "#3b4252"}>
          <rect x="2" y={isAwake ? 3.5 : 4.5} width="2" height={isAwake ? 2 : 0.5} />
          <rect x="5" y={isAwake ? 3.5 : 4.5} width="2" height={isAwake ? 2 : 0.5} />
        </g>
        <rect x="4" y="5.5" width="1" height="1" fill="#e8798f" />
      </svg>
    </div>,
    machine,
  );
}
