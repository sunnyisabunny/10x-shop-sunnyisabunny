/**
 * NOTE: one product's reviews: its own from the API plus any written in this browser (PRD P3.4).
 * Why it exists: the heading's average and the Reviews tab need the same list, and both live in different
 * components. This hook gives both of them one answer.
 * Connects to: `useLocalStorage` saves the local ones under `shop_reviews`. `ProductPage` calls this hook.
 */
import { useCallback, useMemo } from "react";
import type { Product, Review, StoredReviews } from "../types/product";
import { STORAGE_KEYS } from "../utils/constants";
import { parseStoredReviews } from "../utils/guards";
import { useLocalStorage } from "./useLocalStorage";

export interface UseReviewsResult {
  reviews: Review[];
  average: number;
  addReview: (review: Review) => void;
}

export function useReviews(product: Product): UseReviewsResult {
  const [stored, setStored] = useLocalStorage<StoredReviews>(STORAGE_KEYS.reviews, {}, parseStoredReviews);

  /** Local reviews first and newest at the top, then the API's, as the PRD asks. */
  const reviews = useMemo(() => [...(stored[product.id] ?? []), ...product.reviews], [stored, product]);

  /**
   * The average over both lists. It is in `useMemo` because the PRD asks "why is this useMemo here?": this
   * page redraws on every quantity change and tab switch, and none of those change the reviews, so the
   * sum doesn't need redoing. Note this can differ from `product.rating` on the card, because the API's
   * `rating` isn't derived from its own reviews.
   */
  const average = useMemo(() => {
    if (reviews.length === 0) {
      return product.rating;
    }
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews, product.rating]);

  const addReview = useCallback(
    (review: Review) => {
      setStored({ ...stored, [product.id]: [review, ...(stored[product.id] ?? [])] });
    },
    [stored, product.id, setStored],
  );

  return { reviews, average, addReview };
}
