"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ImageUploadDropzone } from "@/components/shared/image-upload";
import { qk } from "@/lib/api/queryKeys";
import {
  createVariantImage,
  deleteVariantImage,
  listVariantImages,
  updateVariantImage,
} from "@/features/admin/products-api";
import {
  variantImageFormSchema,
  type VariantImageFormValues,
} from "@/features/admin/product-components/product-schemas";
import type { VariantImage } from "@/types/catalog";
import type { ApiError } from "@/types/envelopes";

function isDisplayOrderConflict(error: ApiError): boolean {
  return error.code === "DISPLAY_ORDER_CONFLICT";
}

export function VariantImagesManager({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const query = useQuery({
    queryKey: qk.admin.variantImages(productId, variantId),
    queryFn: () => listVariantImages(productId, variantId),
  });

  const images = [...(query.data?.data ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  function invalidate() {
    return queryClient.invalidateQueries({
      queryKey: qk.admin.variantImages(productId, variantId),
    });
  }

  const form = useForm<VariantImageFormValues>({
    resolver: zodResolver(variantImageFormSchema),
    defaultValues: { image_url: "", alt_text: "", display_order: "" },
  });

  const addMutation = useMutation({
    mutationFn: (values: VariantImageFormValues) => {
      const order = values.display_order.trim();
      return createVariantImage(productId, variantId, {
        image_url: values.image_url.trim(),
        ...(values.alt_text.trim() !== ""
          ? { alt_text: values.alt_text.trim() }
          : {}),
        ...(order !== "" ? { display_order: Number(order) } : {}),
      });
    },
    onSuccess: async () => {
      toast.success("Image added");
      form.reset({ image_url: "", alt_text: "", display_order: "" });
      await invalidate();
    },
    onError: (error: ApiError) => {
      void invalidate();
      toast.error(error.message || "Could not add the image.");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({
      imageId,
      displayOrder,
    }: {
      imageId: string;
      displayOrder: number;
    }) =>
      updateVariantImage(productId, variantId, imageId, {
        display_order: displayOrder,
      }),
    onSuccess: async () => {
      await invalidate();
    },
    onError: async (error: ApiError) => {
      if (isDisplayOrderConflict(error)) {
        toast.error(error.message || "Display order conflicts with another image.");
      } else {
        toast.error(error.message || "Could not update the image.");
      }
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) =>
      deleteVariantImage(productId, variantId, imageId),
    onSuccess: async () => {
      toast.success("Image removed");
      setPendingDelete(null);
      await invalidate();
    },
    onError: async (error: ApiError) => {
      toast.error(error.message || "Could not remove the image.");
      await invalidate();
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2 px-4 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="px-4 py-4">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border-l-2 border-muted bg-muted/30 p-4">
      {images.length === 0 ? (
        <EmptyState
          title="No variant images"
          description="Add an image by uploading a file or pasting a URL."
          className="py-8"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {images.map((img) => (
            <VariantImageRow
              key={`${img.public_id}-${img.display_order}`}
              image={img}
              saving={reorderMutation.isPending}
              onSaveOrder={(displayOrder) =>
                reorderMutation.mutate({
                  imageId: img.public_id,
                  displayOrder,
                })
              }
              onRemove={() => setPendingDelete(img.public_id)}
            />
          ))}
        </ul>
      )}

      <form
        onSubmit={form.handleSubmit((values) => addMutation.mutate(values))}
        noValidate
        className="flex flex-col gap-3 rounded-lg border border-dashed bg-background p-3"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_7rem]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`vimg-url-${variantId}`}>Image URL</Label>
            <Input
              id={`vimg-url-${variantId}`}
              placeholder="https://…"
              {...form.register("image_url")}
            />
            {form.formState.errors.image_url ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.image_url.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`vimg-alt-${variantId}`}>Alt text</Label>
            <Input
              id={`vimg-alt-${variantId}`}
              placeholder="Optional"
              {...form.register("alt_text")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`vimg-order-${variantId}`}>Order</Label>
            <Input
              id={`vimg-order-${variantId}`}
              type="number"
              min={0}
              placeholder={String(
                images.reduce((max, img) => Math.max(max, img.display_order), 0) +
                  1,
              )}
              {...form.register("display_order")}
            />
            {form.formState.errors.display_order ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.display_order.message}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={
              addMutation.isPending ||
              form.formState.errors.image_url !== undefined
            }
          >
            {addMutation.isPending ? "Adding…" : "Add URL"}
          </Button>
          <ImageUploadDropzone
            disabled={addMutation.isPending}
            maxFiles={1}
            onUploaded={(urls) => {
              form.setValue("image_url", urls[0] ?? "", {
                shouldValidate: urls.length > 0,
              });
            }}
          />
        </div>
      </form>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Remove this variant image?"
        description="The image is permanently deleted from the variant gallery."
        confirmLabel="Remove image"
        destructive
        onConfirm={async () => {
          if (pendingDelete) {
            await deleteMutation.mutateAsync(pendingDelete).catch(() => undefined);
          }
        }}
      />
    </div>
  );
}

function VariantImageRow({
  image,
  saving,
  onSaveOrder,
  onRemove,
}: {
  image: VariantImage;
  saving: boolean;
  onSaveOrder: (displayOrder: number) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(String(image.display_order));
  const dirty = draft !== String(image.display_order) && /^\d+$/.test(draft);

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-background p-2">
      <img
        src={image.image_url}
        alt={image.alt_text ?? ""}
        className="size-12 shrink-0 rounded-md border object-cover"
        loading="lazy"
      />
      <span
        className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
        title={image.alt_text ?? image.image_url}
      >
        {image.alt_text || image.image_url}
      </span>
      <div className="flex items-center gap-2">
        <Label htmlFor={`order-${image.public_id}`} className="sr-only">
          Display order
        </Label>
        <Input
          id={`order-${image.public_id}`}
          type="number"
          min={0}
          className="w-20"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!dirty || saving}
          aria-label={`Save display order for ${image.alt_text || "image"}`}
          onClick={() => onSaveOrder(Number(draft))}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label="Remove image"
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}
