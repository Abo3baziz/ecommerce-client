"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Rating } from "@/components/shared/rating";
import { Separator } from "@/components/ui/separator";
import type { AdminReviewRow } from "@/types/reviews";
import { formatDateTime } from "@/lib/format";

interface ReviewDetailDialogProps {
  review: AdminReviewRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDetailDialog({
  review,
  open,
  onOpenChange,
}: ReviewDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6">
            {review.title ?? `Review for ${review.product_name}`}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Rating value={review.rating} />
            <DialogDescription>
              {formatDateTime(review.created_at)}
            </DialogDescription>
            {review.deleted_at ? (
              <Badge variant="outline">deleted</Badge>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Customer
            </span>
            <p>{review.customer_name}</p>
            <p className="text-muted-foreground">{review.customer_email}</p>
          </div>

          <Separator />

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Product
            </span>
            <p>{review.product_name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {review.product_slug}
            </p>
          </div>

          <Separator />

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Comment
            </span>
            <p className="whitespace-pre-line">
              {review.comment ?? "No comment was left."}
            </p>
          </div>

          {review.images.length > 0 ? (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Images ({review.images.length})
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {review.images.map((image) => (
                    <img
                      key={image.public_id}
                      src={image.image_url}
                      alt={image.alt_text ?? "Review image"}
                      className="size-16 rounded-md border object-cover"
                    />
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <p className="font-mono text-xs text-muted-foreground">
            {review.public_id} · updated {formatDateTime(review.updated_at)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
