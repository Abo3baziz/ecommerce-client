"use client";

import { formatDate } from "@/lib/format";
import { Rating } from "@/components/shared/rating";
import type { ReviewBase } from "@/types";

export function ReviewCard({ review }: { review: ReviewBase }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rating value={review.rating} />
          <span className="text-sm font-medium">{review.customer_name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(review.created_at)}
        </span>
      </div>
      {review.title ? (
        <p className="text-sm font-semibold">{review.title}</p>
      ) : null}
      {review.comment ? (
        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {review.comment}
        </p>
      ) : null}
      {review.images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {review.images.map((image) => (
            <div
              key={image.public_id}
              className="overflow-hidden rounded-md border bg-muted"
            >
              <img
                src={image.image_url}
                alt={image.alt_text ?? `Photo from ${review.customer_name}`}
                loading="lazy"
                className="aspect-square size-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
