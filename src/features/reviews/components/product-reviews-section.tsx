"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromReviews } from "@/components/shared/pagination";
import { Rating } from "@/components/shared/rating";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";
import type { ProductReviewListParams } from "@/types";
import { useProductReviews } from "../hooks";
import { ReviewCard, ReviewCardSkeleton } from "./review-card";
import { WriteReviewDialog } from "./write-review-dialog";

const REVIEWS_PAGE_SIZE = 5;

type ReviewSortWire = "-created_at" | "-rating";

function readPositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

interface ProductReviewsSectionProps {
  productId: string;
}

export function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const [writeOpen, setWriteOpen] = useState(false);

  const ratingRaw = readPositiveInt(searchParams.get("rating"));
  const ratingFilter =
    ratingRaw !== null && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;
  const sortWire: ReviewSortWire =
    searchParams.get("rev_sort") === "-rating" ? "-rating" : "-created_at";
  const page = readPositiveInt(searchParams.get("rev_page")) ?? 1;

  function updateUrl(updates: {
    rating?: number | null;
    sort?: ReviewSortWire;
    page?: number | null;
  }) {
    const next = new URLSearchParams(Array.from(searchParams.entries()));
    if (updates.rating !== undefined) {
      if (updates.rating === null) {
        next.delete("rating");
      } else {
        next.set("rating", String(updates.rating));
      }
    }
    if (updates.sort !== undefined) {
      if (updates.sort === "-created_at") {
        next.delete("rev_sort");
      } else {
        next.set("rev_sort", updates.sort);
      }
    }
    if (
      !("page" in updates) ||
      updates.page === null ||
      updates.page === undefined ||
      updates.page <= 1
    ) {
      next.delete("rev_page");
    } else {
      next.set("rev_page", String(updates.page));
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function handleWriteClick() {
    if (!user) {
      const current = searchParams.size
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      router.push(`/login?from=${encodeURIComponent(current)}`);
      return;
    }
    setWriteOpen(true);
  }

  const params: ProductReviewListParams = {
    page,
    limit: REVIEWS_PAGE_SIZE,
    rating: ratingFilter ?? undefined,
    sort: sortWire === "-rating" ? "rating" : "created_at",
    desc: true,
  };

  const reviewsQuery = useProductReviews(productId, params);
  const summary = reviewsQuery.data?.summary ?? null;
  const hasFilters = ratingFilter !== null;

  return (
    <section id="reviews" className="mt-12 scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Customer reviews</h2>
        <Button variant="outline" size="sm" onClick={handleWriteClick}>
          Write a review
        </Button>
      </div>

      <div className="mb-4 inline-flex items-center gap-3 rounded-lg border px-4 py-2">
        <Rating value={summary?.average_rating ?? null} />
        <span className="text-sm text-muted-foreground">
          {summary && summary.average_rating !== null
            ? `${summary.average_rating.toFixed(1)} · ${summary.total_count} ${
                summary.total_count === 1 ? "review" : "reviews"
              }`
            : `No ratings yet · ${summary?.total_count ?? 0} ${
                (summary?.total_count ?? 0) === 1 ? "review" : "reviews"
              }`}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by rating">
          {[null, 5, 4, 3, 2, 1].map((value) => {
            const active = ratingFilter === value;
            return (
              <button
                key={value ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => updateUrl({ rating: value, page: null })}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                {value === null ? "All" : `${value} ★`}
              </button>
            );
          })}
        </div>
        <Select
          value={sortWire}
          onValueChange={(value) =>
            updateUrl({ sort: value as ReviewSortWire, page: null })
          }
        >
          <SelectTrigger aria-label="Sort reviews" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-created_at">Newest first</SelectItem>
            <SelectItem value="-rating">Highest rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reviewsQuery.isPending ? (
        <div className="flex flex-col gap-3" aria-hidden>
          {[0, 1, 2].map((index) => (
            <ReviewCardSkeleton key={index} />
          ))}
        </div>
      ) : reviewsQuery.isError ? (
        <ErrorState
          error={reviewsQuery.error}
          onRetry={() => void reviewsQuery.refetch()}
        />
      ) : !reviewsQuery.data || reviewsQuery.data.reviews.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No reviews with this rating" : "No reviews yet"}
          description={
            hasFilters
              ? "Try another rating filter."
              : "Be the first to share your experience."
          }
          action={
            <Button variant="outline" size="sm" onClick={handleWriteClick}>
              Write a review
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {reviewsQuery.data.reviews.map((review) => (
              <ReviewCard key={review.public_id} review={review} />
            ))}
          </div>
          <PaginationFromReviews
            className="mt-6"
            page={reviewsQuery.data.pagination.page}
            pagination={{
              page: reviewsQuery.data.pagination.page,
              has_more: reviewsQuery.data.pagination.has_more,
            }}
            onPageChange={(nextPage) => updateUrl({ page: nextPage })}
          />
        </>
      )}

      <WriteReviewDialog
        productId={productId}
        open={writeOpen}
        onOpenChange={(open) => setWriteOpen(open)}
      />
    </section>
  );
}
