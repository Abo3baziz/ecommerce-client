"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { z } from "zod";
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
import type { ApiError } from "@/types/envelopes";
import type { MyReview, UpdateReviewInput } from "@/types";

const MAX_IMAGES = 5;

const reviewEditSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Pick a star rating")
    .max(5, "Pick a star rating"),
  title: z.string().trim().max(255, "Max 255 characters"),
  comment: z.string().trim().max(5000, "Max 5000 characters"),
});

type ReviewEditValues = z.infer<typeof reviewEditSchema>;

interface ReviewEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: MyReview | null;
  onSave: (input: UpdateReviewInput) => Promise<void>;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ReviewForm({
  review,
  onSave,
  onDone,
}: {
  review: MyReview;
  onSave: (input: UpdateReviewInput) => Promise<void>;
  onDone: () => void;
}) {
  const [images, setImages] = useState<string[]>(
    review.images.map((image) => image.image_url),
  );
  const [imageInput, setImageInput] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [rootError, setRootError] = useState<string | null>(null);

  const form = useForm<ReviewEditValues>({
    resolver: zodResolver(reviewEditSchema),
    defaultValues: {
      rating: review.rating,
      title: review.title ?? "",
      comment: review.comment ?? "",
    },
  });
  const rating = useWatch({ control: form.control, name: "rating" });
  const errors = form.formState.errors;

  function addImage() {
    setImageError(null);
    const url = imageInput.trim();
    if (!url) {
      setImageError("Paste an image URL first.");
      return;
    }
    if (!isValidHttpUrl(url)) {
      setImageError("Enter a valid http(s) image URL.");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setImageError(`Up to ${MAX_IMAGES} photos are allowed.`);
      return;
    }
    if (images.includes(url)) {
      setImageError("That image is already attached.");
      return;
    }
    setImages((prev) => [...prev, url]);
    setImageInput("");
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((item) => item !== url));
    setImageError(null);
  }

  async function handleSubmit(values: ReviewEditValues) {
    setRootError(null);
    try {
      await onSave({
        rating: values.rating,
        title: values.title ? values.title : null,
        comment: values.comment ? values.comment : null,
        images: images.map((image_url) => ({ image_url })),
      });
      onDone();
    } catch (error) {
      const err = error as ApiError;
      if (err.status === 422) {
        setRootError(err.message || "Your review could not be validated.");
      } else if (err.status === 429) {
        setRootError(
          err.message || "Too many attempts. Please wait and try again.",
        );
      } else {
        setRootError(err.message || "Could not save your review.");
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <div className="flex flex-col gap-4">
        {rootError ? (
          <p role="alert" className="text-sm text-destructive">
            {rootError}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label>Rating</Label>
          <RatingInput
            value={rating ?? null}
            onChange={(value) => form.setValue("rating", value)}
            disabled={form.formState.isSubmitting}
          />
          {errors.rating ? (
            <p className="text-sm text-destructive">{errors.rating.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-title">Title</Label>
          <Input
            id="review-title"
            placeholder="Sum up your experience"
            {...form.register("title")}
          />
          {errors.title ? (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-comment">Comment</Label>
          <Textarea
            id="review-comment"
            rows={5}
            placeholder="What did you like or dislike?"
            {...form.register("comment")}
          />
          {errors.comment ? (
            <p className="text-sm text-destructive">{errors.comment.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <Label>Photos</Label>
          <p className="text-xs text-muted-foreground">
            Saving replaces the entire photo set for this review.
          </p>
          <div className="flex gap-2">
            <Input
              value={imageInput}
              onChange={(event) => setImageInput(event.target.value)}
              placeholder="https://…"
              aria-label="Photo URL"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addImage();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addImage}
              disabled={images.length >= MAX_IMAGES}
              aria-label="Add photo"
            >
              <Plus aria-hidden className="size-4" />
            </Button>
          </div>
          {imageError ? (
            <p className="text-sm text-destructive">{imageError}</p>
          ) : null}
          {images.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {images.map((url) => (
                <li
                  key={url}
                  className="flex max-w-full items-center gap-1 rounded-md border bg-muted/40 py-1 pr-1 pl-2 text-xs"
                >
                  <span className="max-w-52 truncate">{url}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeImage(url)}
                    aria-label={`Remove photo ${url}`}
                  >
                    <X aria-hidden className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No photos attached.</p>
          )}
        </div>
      </div>
      <DialogFooter className="mt-6">
        <Button
          type="button"
          variant="outline"
          disabled={form.formState.isSubmitting}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save review"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ReviewEditDialog({
  open,
  onOpenChange,
  review,
  onSave,
}: ReviewEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit review</DialogTitle>
          <DialogDescription>
            Edited reviews may go back into moderation before they appear
            publicly again.
          </DialogDescription>
        </DialogHeader>
        {open && review ? (
          <ReviewForm
            review={review}
            onSave={onSave}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
