"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RatingInput } from "@/components/shared/rating";
import { qk } from "@/lib/api/queryKeys";
import { moderateAdminReview } from "@/features/admin/reviews-api";
import type { AdminReviewRow } from "@/types/reviews";
import type { ApiError } from "@/types/envelopes";

interface EditReviewDialogProps {
  review: AdminReviewRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditReviewDialog({
  review,
  open,
  onOpenChange,
}: EditReviewDialogProps) {
  if (!open) return null;
  return (
    <EditReviewDialogInner
      key={review.public_id}
      review={review}
      onOpenChange={onOpenChange}
    />
  );
}

function EditReviewDialogInner({
  review,
  onOpenChange,
}: {
  review: AdminReviewRow;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title ?? "");
  const [comment, setComment] = useState(review.comment ?? "");
  const [rootError, setRootError] = useState<string | null>(null);

  const titleInvalid = title.length > 255;
  const commentInvalid = comment.length > 5000;

  const mutation = useMutation({
    mutationFn: () =>
      moderateAdminReview(review.public_id, {
        rating,
        title: title.trim() === "" ? null : title.trim(),
        comment: comment.trim() === "" ? null : comment.trim(),
      }),
    onSuccess: async () => {
      toast.success("Review updated");
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      await queryClient.invalidateQueries({
        queryKey: qk.admin.review(review.public_id),
      });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      setRootError(error.message || "Could not update the review.");
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit review</DialogTitle>
          <DialogDescription>
            Images are read-only here — only the rating and text can change.
            Clearing a field removes it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {rootError ? (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label>Rating</Label>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="review-title">Title</Label>
            <Input
              id="review-title"
              value={title}
              placeholder="Leave blank to clear"
              autoComplete="off"
              onChange={(e) => setTitle(e.target.value)}
            />
            {titleInvalid ? (
              <p className="text-sm text-destructive">Max 255 characters.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="review-comment">Comment</Label>
            <Textarea
              id="review-comment"
              rows={5}
              value={comment}
              placeholder="Leave blank to clear"
              onChange={(e) => setComment(e.target.value)}
            />
            {commentInvalid ? (
              <p className="text-sm text-destructive">Max 5000 characters.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Images (read-only)</Label>
            {review.images.length === 0 ? (
              <p className="text-sm text-muted-foreground">No images.</p>
            ) : (
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
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              mutation.isPending || titleInvalid || commentInvalid || rating < 1 || rating > 5
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
