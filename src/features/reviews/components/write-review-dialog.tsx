"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
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
  images: z.array(
    z.object({
      url: z
        .string()
        .trim()
        .url("Enter a valid URL (or leave the field empty)")
        .or(z.literal("")),
    }),
  ),
});

type WriteReviewValues = z.infer<typeof writeReviewSchema>;

const MAX_IMAGES = 5;

function initialValues(): WriteReviewValues {
  return { rating: 0, title: "", comment: "", images: [{ url: "" }] };
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

  const imageArray = useFieldArray({ control: form.control, name: "images" });

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: qk.productReviews(productId),
      });
      toast.success("Review submitted for moderation");
      form.reset(initialValues());
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
      images: values.images
        .map((image) => ({ image_url: image.url.trim() }))
        .filter((image) => image.image_url !== ""),
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
            <Label>Photos (URLs, optional)</Label>
            {imageArray.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder="https://example.com/photo.jpg"
                  aria-label={`Photo URL ${index + 1}`}
                  {...form.register(`images.${index}.url` as const)}
                />
                {imageArray.fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove photo URL ${index + 1}`}
                    onClick={() => imageArray.remove(index)}
                  >
                    ×
                  </Button>
                ) : null}
              </div>
            ))}
            {imageArray.fields.length < MAX_IMAGES ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => imageArray.append({ url: "" })}
              >
                Add another photo URL
              </Button>
            ) : null}
            {typeof form.formState.errors.images?.message === "string" ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.images.message}
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
