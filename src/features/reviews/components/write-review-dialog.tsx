"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { X } from "lucide-react";
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
import { ImageUploadDropzone } from "@/components/shared/image-upload";
import { CUSTOMER_IMAGEKIT_AUTH_PATH } from "@/lib/api/imagekit";
import { qk } from "@/lib/api/queryKeys";
import { createReview } from "../api";
import type { ApiError } from "@/types/envelopes";

const writeReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Select a star rating")
    .max(5, "Select a star rating"),
  title: z.string().trim().max(255, "Max 255 characters"),
  comment: z.string().trim().max(5000, "Max 5000 characters"),
});

type WriteReviewValues = z.infer<typeof writeReviewSchema>;

const MAX_IMAGES = 5;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function initialValues(): WriteReviewValues {
  return { rating: 0, title: "", comment: "" };
}

interface WriteReviewDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WriteReviewDialog({
  productId,
  open,
  onOpenChange,
}: WriteReviewDialogProps) {
  const queryClient = useQueryClient();
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const form = useForm<WriteReviewValues>({
    resolver: zodResolver(writeReviewSchema),
    defaultValues: initialValues(),
  });

  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [manualUrls, setManualUrls] = useState<string[]>([]);
  const [manualUrl, setManualUrl] = useState<string>("");
  const [manualUrlInvalid, setManualUrlInvalid] = useState(false);
  const photoCount = uploadedUrls.length + manualUrls.length;

  function addManualUrl() {
    const trimmed = manualUrl.trim();
    if (trimmed === "" || photoCount >= MAX_IMAGES) return;
    if (!isHttpUrl(trimmed)) {
      setManualUrlInvalid(true);
      return;
    }
    setManualUrls((prev) => [...prev, trimmed]);
    setManualUrl("");
    setManualUrlInvalid(false);
  }

  function removeManualUrl(url: string) {
    setManualUrls((prev) => prev.filter((entry) => entry !== url));
  }

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: qk.productReviews(productId),
      });
      toast.success("Review submitted for moderation");
      form.reset(initialValues());
      setUploadedUrls([]);
      setManualUrls([]);
      setManualUrl("");
      setManualUrlInvalid(false);
      setSelectedRating(null);
      setCommentLength(0);
      setAlreadyReviewed(false);
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      if (error.status === 409) {
        setAlreadyReviewed(true);
        return;
      }
      toast.error(error.message || "Could not submit your review. Try again.");
    },
  });

  const [commentLength, setCommentLength] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  function onSubmit(values: WriteReviewValues) {
    setAlreadyReviewed(false);
    mutation.mutate({
      product_public_id: productId as `prd_${string}`,
      rating: values.rating,
      title: values.title || undefined,
      comment: values.comment || undefined,
      images: [...uploadedUrls, ...manualUrls]
        .slice(0, MAX_IMAGES)
        .map((image_url) => ({ image_url })),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setAlreadyReviewed(false);
          setSelectedRating(null);
          setCommentLength(0);
          setUploadedUrls([]);
          setManualUrls([]);
          setManualUrl("");
          setManualUrlInvalid(false);
          form.reset(initialValues());
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write a review</DialogTitle>
          <DialogDescription>
            Share your experience with this product.
          </DialogDescription>
        </DialogHeader>

        {alreadyReviewed ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
          >
            <span>
              You have already reviewed this product.{" "}
              <Link
                href="/account/reviews"
                className="underline underline-offset-4"
              >
                Edit it in My reviews
              </Link>
              .
            </span>
          </div>
        ) : null}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>Your rating</Label>
            <RatingInput
              value={selectedRating}
              onChange={(value) => {
                setSelectedRating(value);
                form.setValue("rating", value, { shouldValidate: true });
              }}
            />
            {form.formState.errors.rating ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.rating.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="review-title">Title</Label>
            <Input
              id="review-title"
              placeholder="Sum it up in a few words"
              maxLength={255}
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="review-comment">Comment</Label>
            <Textarea
              id="review-comment"
              rows={4}
              placeholder="What did you like or dislike?"
              {...form.register("comment", {
                onChange: (event) => setCommentLength(event.target.value.length),
              })}
            />
            <p
              className={`text-xs ${
                commentLength > 5000
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {commentLength}/5000
            </p>
            {form.formState.errors.comment ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.comment.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Photos (optional, up to {MAX_IMAGES})</Label>
            <ImageUploadDropzone
              maxFiles={MAX_IMAGES - manualUrls.length}
              authPath={CUSTOMER_IMAGEKIT_AUTH_PATH}
              onUploaded={setUploadedUrls}
              label="Add photos of the product"
            />
            {manualUrls.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {manualUrls.map((url) => (
                  <li
                    key={url}
                    className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2.5 text-xs text-muted-foreground"
                  >
                    <span className="max-w-40 truncate" title={url}>
                      {url}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${url}`}
                      className="flex size-4 items-center justify-center rounded-full hover:bg-accent hover:text-foreground"
                      onClick={() => removeManualUrl(url)}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center gap-2">
              <Input
                value={manualUrl}
                placeholder="Or paste an image URL (https://…)"
                aria-label="Photo URL"
                aria-invalid={manualUrlInvalid}
                disabled={photoCount >= MAX_IMAGES}
                onChange={(event) => {
                  setManualUrl(event.target.value);
                  setManualUrlInvalid(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addManualUrl();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  manualUrl.trim() === "" || photoCount >= MAX_IMAGES
                }
                onClick={addManualUrl}
              >
                Add
              </Button>
            </div>
            {manualUrlInvalid ? (
              <p className="text-xs text-destructive">
                Enter a valid http(s) image URL.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAlreadyReviewed(false);
                setSelectedRating(null);
                setCommentLength(0);
                setUploadedUrls([]);
                setManualUrls([]);
                setManualUrl("");
                setManualUrlInvalid(false);
                form.reset(initialValues());
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
