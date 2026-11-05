/**
 * NOTE: the Reviews tab: the list and the "Write a review" form (PRD P3.4).
 * Why it exists: it keeps the form's state and rules out of `ProductPage`.
 * Connects to: `ProductPage` passes the list and `onAdd`. The new review goes through `useReviews`.
 */
import { useState, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Review } from "../../types/product";
import { MIN_COMMENT_LENGTH } from "../../utils/constants";
import { formatDate } from "../../utils/format";
import { buttonStyles } from "../ui/Button";
import { inputStyles } from "../ui/FormField";

interface ReviewsPanelProps {
  reviews: Review[];
  onAdd: (review: Review) => void;
}

/** Five stars, filled up to the rating, with the number spelled out for screen readers. */
function Stars({ rating }: { rating: number }) {
  return <span aria-label={`${rating} out of 5`}>{"★".repeat(rating) + "☆".repeat(5 - rating)}</span>;
}

export default function ReviewsPanel({ reviews, onAdd }: ReviewsPanelProps) {
  const { displayName } = useAuth();
  const { showToast } = useToast();

  /** The chosen rating as text, because that is what a <select> holds. Empty means nothing chosen yet. */
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  /** Validates with the PRD's exact messages. Only a valid review is added, and then the form empties. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextRatingError = rating === "" ? "Please select a rating" : null;
    const nextCommentError = comment.trim().length < MIN_COMMENT_LENGTH ? `Comment must be at least ${MIN_COMMENT_LENGTH} characters` : null;
    setRatingError(nextRatingError);
    setCommentError(nextCommentError);
    if (nextRatingError !== null || nextCommentError !== null) {
      return;
    }

    onAdd({
      rating: Number(rating),
      comment: comment.trim(),
      date: new Date().toISOString(),
      reviewerName: displayName ?? "Guest",
    });
    setRating("");
    setComment("");
    showToast("Review added ✓");
  }

  return (
    <div className="grid gap-x-8 gap-y-3 desktop:grid-cols-2">
      <ul>
        {reviews.map((review, index) => (
          // Two people can post the same words, and reviews never reorder, so this mix is a safe stable key.
          <li key={`${review.date}-${index}`} className="border-b border-edge py-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <strong>{review.reviewerName}</strong>
              <Stars rating={Math.round(review.rating)} />
              <span className="text-[13px] text-ink-soft">{formatDate(review.date)}</span>
            </div>
            <p className="text-ink-soft">{review.comment}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} noValidate className="grid content-start gap-2.5 pt-3">
        <h2 className="font-bold">Write a review</h2>
        <div className="grid gap-1">
          <label htmlFor="review-rating" className="text-[13px] text-ink-soft">
            Rating
          </label>
          <select
            id="review-rating"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            aria-invalid={ratingError !== null}
            aria-describedby={ratingError !== null ? "review-rating-error" : undefined}
            className={inputStyles}
          >
            <option value="">Select a rating</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {ratingError !== null && (
            <p id="review-rating-error" className="text-[13px] font-semibold text-error">
              {ratingError}
            </p>
          )}
        </div>
        <div className="grid gap-1">
          <label htmlFor="review-comment" className="text-[13px] text-ink-soft">
            Comment
          </label>
          <textarea
            id="review-comment"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-invalid={commentError !== null}
            aria-describedby={commentError !== null ? "review-comment-error" : undefined}
            className={`${inputStyles} h-auto py-2.5`}
          />
          {commentError !== null && (
            <p id="review-comment-error" className="text-[13px] font-semibold text-error">
              {commentError}
            </p>
          )}
        </div>
        <button type="submit" className={`${buttonStyles.quiet} justify-self-start`}>
          Submit review
        </button>
      </form>
    </div>
  );
}
