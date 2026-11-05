/**
 * NOTE: the product page's photo viewer: one large photo and a row of small ones (PRD P3).
 * Why it exists: `ProductPage` shouldn't also manage which photo is showing.
 * Connects to: `ProductPage`. It gets a `key` there, so moving to another product starts at its first photo.
 */
import { useState } from "react";
import { DiscountBadge } from "./PriceBlock";

interface GalleryProps {
  title: string;
  images: string[];
  discountPercentage: number;
}

export default function Gallery({ title, images, discountPercentage }: GalleryProps) {
  /** Which photo is large. Only this component needs it, so it stays local instead of going in Context. */
  const [selected, setSelected] = useState(0);

  return (
    <div className="min-w-0">
      <div className="lit-glass relative flex aspect-[1/0.82] items-center justify-center overflow-hidden rounded-lg">
        <DiscountBadge discountPercentage={discountPercentage} />
        <img
          src={images[selected]}
          alt={title}
          width={1000}
          height={1000}
          /* The largest thing on this page, so it is what Lighthouse times as LCP. This asks the browser to fetch it first. */
          fetchPriority="high"
          className="aspect-square h-auto w-[86%] max-w-full object-contain"
        />
      </div>

      {/* 78 products have a single photo, and a row with one thumbnail would only be clutter. */}
      {images.length > 1 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className="size-[76px] rounded-md bg-[linear-gradient(180deg,#fbfdff,#c6d4e2)] p-1 shadow-[inset_0_0_0_1px_var(--edge)] aria-pressed:shadow-[0_0_0_2px_var(--color-pink)]"
            >
              <img src={image} alt="" width={68} height={68} loading="lazy" className="size-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
