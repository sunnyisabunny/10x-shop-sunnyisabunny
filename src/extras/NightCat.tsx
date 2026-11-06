/**
 * NOTE: a pixel cat asleep on top of the machine. It wakes up when something is added to the cart, and jumps if it is
 * clicked or if the machine shakes (beyond the spec).
 * Why it exists: a small reward for adding something, which never gets in the way. It only appears at night, because it
 * is on the night shift, and by day the bonsai has the top of the cabinet.
 * Connects to: `ExtrasHost` draws this inside `#machine`. It only watches the cart's count and the machine's own animation,
 * so neither the cart nor `MachinePanel` knows about it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useSlot } from "./useSlot";

/** How long the cat stays awake before going back to sleep. */
const AWAKE_MS = 2600;

/** How long a fright lasts. It matches `cat-jump` in `extras.css`. */
const STARTLED_MS = 640;

/** The name of the machine's shake in `extras.css`. The Shake button and the 10X overload both run it. */
const MACHINE_SHAKE = "machine-shake";

/** The drawing, as [x, y, width, height] blocks grouped by colour, on a 20 by 12.5 grid. */
const FUR = [[2, 1.5, 1, 1], [6, 1.5, 1, 1], [2, 2.5, 2, 1], [5, 2.5, 2, 1], [1, 3.5, 7, 1], [1, 4.5, 8, 1], [1, 5.5, 16, 1], [1, 6.5, 17, 1], [2, 7.5, 17, 1], [3, 8.5, 16, 1], [3, 9.5, 13, 2], [16, 10.5, 3, 1], [18, 9.5, 1, 1]];
const PATCHES = [[6, 1.5, 1, 2], [9, 5.5, 6, 1], [10, 6.5, 6, 1], [11, 7.5, 4, 1]];
const PAWS = [[4, 9.5, 1, 1], [7, 9.5, 1, 1]];

/** What a fright adds: fur standing up along the back, and a bristling tail. */
const BRISTLES = [[9, 4.5, 1, 1], [11, 4, 1, 1.5], [13, 4, 1, 1.5], [15, 4.5, 1, 1], [18, 2, 1, 7.5], [17, 3, 1, 1], [19, 4, 1, 1], [17, 5, 1, 1], [19, 6.5, 1, 1]];

/** Small pupils in wide eyes, which is most of what makes it look frightened. */
const PUPILS = [[2.5, 4, 1, 1], [5.5, 4, 1, 1]];

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
  const { showToast } = useToast();

  /** Whether the eyes are open. */
  const [isAwake, setIsAwake] = useState(false);

  /** Whether the cat is in the middle of a fright. */
  const [isStartled, setIsStartled] = useState(false);

  /** The count last seen, so only a rise wakes the cat. Removing something from the cart doesn't. */
  const lastCount = useRef(itemCount);

  /** The running timer. A ref, so adding again can restart it, and other cart changes leave it alone. */
  const sleepTimer = useRef<number | undefined>(undefined);

  /** The timer that ends a fright. A ref for the same reason. */
  const startledTimer = useRef<number | undefined>(undefined);

  /** Opens the eyes and restarts the wait before sleep. Adding something and a fright both do this. */
  const wake = useCallback(() => {
    setIsAwake(true);
    window.clearTimeout(sleepTimer.current);
    sleepTimer.current = window.setTimeout(() => setIsAwake(false), AWAKE_MS);
  }, []);

  /** Starts a fright. Another one in mid-air is ignored, because a cat can't jump off nothing. A timer ends it, not the animation's end, because that animation doesn't run for anyone who asks for less motion. */
  const startle = useCallback(() => {
    wake();
    if (startledTimer.current !== undefined) {
      return;
    }
    setIsStartled(true);
    startledTimer.current = window.setTimeout(() => {
      startledTimer.current = undefined;
      setIsStartled(false);
    }, STARTLED_MS);
  }, [wake]);

  // Wakes when the count rises, and goes back to sleep once it has been left alone for a while.
  useEffect(() => {
    if (itemCount > lastCount.current) {
      wake();
    }
    lastCount.current = itemCount;
  }, [itemCount, wake]);

  // Jumps when the machine shakes. It listens for the shake itself, so whatever shakes the machine counts, and nothing has
  // to tell the cat. The check on the target is there because animations inside the machine report here too, the cat's own
  // included. The cleanup removes the listener if the machine or the extras go away.
  useEffect(() => {
    if (machine === null) {
      return;
    }
    function handleAnimation(event: AnimationEvent) {
      if (event.target === machine && event.animationName === MACHINE_SHAKE) {
        startle();
      }
    }
    machine.addEventListener("animationstart", handleAnimation);
    return () => machine.removeEventListener("animationstart", handleAnimation);
  }, [machine, startle]);

  // Stops the timers when this goes away, or they would try to update a component that no longer exists.
  useEffect(
    () => () => {
      window.clearTimeout(sleepTimer.current);
      window.clearTimeout(startledTimer.current);
    },
    [],
  );

  /** The click. The message is what tells a screen reader anything happened, as the jump itself is silent. */
  function handleClick() {
    startle();
    showToast("The cat has noted this.");
  }

  if (machine === null) {
    return null;
  }

  return createPortal(
    <button type="button" data-screen-only aria-label="Startle the cat" onClick={handleClick} className="night-cat" data-awake={isAwake} data-startled={isStartled}>
      {!isAwake && (
        <span aria-hidden="true" className="night-cat-zz">
          z
        </span>
      )}
      <span className="night-cat-body">
        {isStartled && (
          <span aria-hidden="true" className="night-cat-shock">
            !
          </span>
        )}
        <svg aria-hidden="true" viewBox="0 0 20 12.5" width="80" height="50" shapeRendering="crispEdges">
          <Blocks blocks={FUR} fill="#d5dae3" />
          {isStartled && <Blocks blocks={BRISTLES} fill="#d5dae3" />}
          <Blocks blocks={PATCHES} fill="#f2a53c" />
          <Blocks blocks={PAWS} fill="#3b4252" />
          {/* Open eyes are tall and lit. Closed ones are a thin dark line. */}
          <g fill={isAwake ? "#ffb627" : "#3b4252"}>
            <rect x="2" y={isAwake ? 3.5 : 4.5} width="2" height={isAwake ? 2 : 0.5} />
            <rect x="5" y={isAwake ? 3.5 : 4.5} width="2" height={isAwake ? 2 : 0.5} />
          </g>
          {isStartled && <Blocks blocks={PUPILS} fill="#15171c" />}
          <rect x="4" y="5.5" width="1" height="1" fill="#e8798f" />
        </svg>
      </span>
    </button>,
    machine,
  );
}
