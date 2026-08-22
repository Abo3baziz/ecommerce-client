"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromReviews } from "@/components/shared/pagination";
import { Rating } from "@/components/shared/rating";
import { deleteReview, updateReview } from "@/features/account/api";
import { useMyReviews } from "@/features/account/hooks";
import { ReviewEditDialog } from "@/features/account/components/review-edit-dialog";
import { qk } from "@/lib/api/queryKeys";
import { formatDate } from "@/lib/format";
import type { MyReview, UpdateReviewInput } from "@/types";

export default function AccountReviewsPage() {
  const [page, setPage] = useState(1);
  const reviewsQuery = useMyReviews(page);
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<MyReview | null>(null);
  const [deleting, setDeleting] = useState<MyReview | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: qk.myReviews() });
    await queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
  }

  async function handleSave(input: UpdateReviewInput) {
    if (!editing) {
      return;
    }
    await updateReview(editing.public_id, input);
    toast.success(
      "Review updated. It may be re-moderated before appearing publicly.",
    );
    await refresh();
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleting) {
      return;
    }
    try {
      await deleteReview(deleting.public_id);
      toast.success("Review deleted.");
    } catch (error) {
      const err = error as { status?: number; message?: string };
      if (err.status === 404) {
        toast.error("That review no longer exists.");
      } else {
        toast.error(err.message || "Could not delete the review.");
      }
    }
    await refresh();
  }

  const data = reviewsQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>My reviews</CardTitle>
          <CardDescription>
            Reviews you have written across the catalog.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {reviewsQuery.isPending ? (
            [0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-28 w-full rounded-xl" />
            ))
          ) : reviewsQuery.isError ? (
            <ErrorState
              error={reviewsQuery.error}
              onRetry={() => void reviewsQuery.refetch()}
            />
          ) : !data || data.reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="No reviews yet"
              description="Reviews you write on products will show up here."
            />
          ) : (
            data.reviews.map((review) => (
              <div
                key={review.public_id}
                className="flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/products/${review.product_public_id}#reviews`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {review.product_name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Rating value={review.rating} />
                      {review.is_approved ? (
                        <Badge>Approved</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(review)}
                    >
                      <Pencil aria-hidden className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleting(review)}
                    >
                      <Trash2
                        aria-hidden
                        className="size-3.5 text-destructive"
                      />
                      Delete
                    </Button>
                  </div>
                </div>
                {review.title ? (
                  <p className="text-sm font-medium">{review.title}</p>
                ) : null}
                {review.comment ? (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                ) : null}
                {review.images.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {review.images.map((image) => (
                      <img
                        key={image.public_id}
                        src={image.image_url}
                        alt={image.alt_text ?? ""}
                        loading="lazy"
                        className="size-12 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
          {data && data.reviews.length > 0 && data.pagination.has_more ? (
            <PaginationFromReviews
              pagination={{ page: data.pagination.page, has_more: true }}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <ReviewEditDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        review={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        destructive
        title="Delete this review?"
        description={
          deleting
            ? `Your review of "${deleting.product_name}" will be removed permanently.`
            : undefined
        }
        confirmLabel="Delete review"
        onConfirm={handleDelete}
      />
    </div>
  );
}
