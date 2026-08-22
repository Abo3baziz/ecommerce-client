"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { normalizeApiError } from "@/lib/api/client";
import { useReview } from "@/features/reviews/hooks";
import { ReviewCard, ReviewCardSkeleton } from "@/features/reviews/components/review-card";

function ReviewIdView() {
  const params = useParams<{ reviewId: string | string[] }>();
  const rawId = params.reviewId;
  const reviewId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
        ? (rawId[0] ?? "")
        : "";

  const reviewQuery = useReview(reviewId);

  if (!reviewId || reviewQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {[0, 1].map((index) => (
          <ReviewCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (reviewQuery.isError) {
    const status = normalizeApiError(reviewQuery.error).status;
    if (status === 404 || status === 400) {
      return (
        <EmptyState
          title="Review not found"
          description="This review doesn't exist or is no longer available."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/products">Browse products</Link>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        error={reviewQuery.error}
        onRetry={() => void reviewQuery.refetch()}
      />
    );
  }

  const review = reviewQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="self-start text-muted-foreground"
      >
        <Link href={`/products/${review.product_public_id}`}>
          <ArrowLeft aria-hidden className="size-4" />
          Back to {review.product_name}
        </Link>
      </Button>
      <ReviewCard review={review} />
    </div>
  );
}

export default function ReviewDeepLinkPage() {
  return <ReviewIdView />;
}
