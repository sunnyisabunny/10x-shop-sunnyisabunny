/**
 * NOTE: the moving parts of the two scenes behind the machine: a train and cars at night, koi and boats by day.
 * Why it exists: pure atmosphere, beyond the spec. The still art is in `extras.css`, and this adds what moves.
 * Connects to: `ExtrasHost` draws this. It is decoration, so everything is empty markup that CSS fills in, hidden from
 * screen readers, and it needs no state or props.
 *
 * `createPortal` draws these inside elements that `Layout` already has, without `Layout` having to know they exist.
 * That keeps the required code free of the extras: delete `src/extras`, and the shop still works.
 */
import { createPortal } from "react-dom";

/** One drawing from `scene-sprites.css`, plus the classes that place and move it. */
function Part({ sprite, className }: { sprite: string; className: string }) {
  return <i className={`scene-part sprite-${sprite} ${className}`} />;
}

/** A koi. The inner element is what sways, because one element can only run one transform animation at a time. */
function Koi({ sprite, lane }: { sprite: string; lane: number }) {
  return (
    <i className={`scene-part scene-koi scene-koi-${lane}`}>
      <i className={`sprite-${sprite}`} />
    </i>
  );
}

/** Tokyo at night: the train, the road and the lights. The wires are their own layer, so the train passes behind them. */
function NightParts() {
  return (
    <div className="scene-night">
      <Part sprite="train" className="scene-train" />
      <Part sprite="car-small" className="scene-car-far" />
      <Part sprite="car-taxi" className="scene-car-near" />
      <i className="scene-part scene-beacon scene-beacon-a" />
      <i className="scene-part scene-beacon scene-beacon-b" />
      <i className="scene-part scene-dying-sign" />
      <div className="scene-wires" />
    </div>
  );
}

/** The port town by day: carp streamers, boats and gulls above the machine, koi in the canal below. */
function DayParts() {
  return (
    <div className="scene-day">
      <Part sprite="gull" className="scene-gull" />
      <Part sprite="gull" className="scene-gull scene-gull-b" />
      <Part sprite="gull" className="scene-gull scene-gull-c" />
      <Part sprite="boat" className="scene-boat" />
      <Part sprite="boat" className="scene-boat scene-boat-b" />
      <Part sprite="nobori-black" className="scene-nobori scene-nobori-1" />
      <Part sprite="nobori-red" className="scene-nobori scene-nobori-2" />
      <Part sprite="nobori-blue" className="scene-nobori scene-nobori-3" />
      <Koi sprite="koi-kohaku" lane={1} />
      <Koi sprite="koi-ogon" lane={2} />
      <Koi sprite="koi-showa" lane={3} />
      <Koi sprite="koi-white" lane={4} />
      <Koi sprite="koi-kohaku" lane={5} />
      <Koi sprite="koi-showa" lane={6} />
    </div>
  );
}

export default function Scene() {
  const street = document.querySelector(".street");
  const machine = document.getElementById("machine");

  return (
    <>
      {street &&
        createPortal(
          <>
            <NightParts />
            <DayParts />
          </>,
          street,
        )}
      {machine && createPortal(<i data-screen-only aria-hidden="true" className="scene-bonsai sprite-bonsai" />, machine)}
    </>
  );
}
