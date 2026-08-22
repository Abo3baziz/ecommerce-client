"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import {
  MoreVertical,
  Plus,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ImageUploadDropzone } from "@/components/shared/image-upload";
import { qk } from "@/lib/api/queryKeys";
import type { AdminProductImage } from "@/types/catalog";
import type { ApiError } from "@/types/envelopes";
import {
  createProductImage,
  deleteProductImage,
  listProductImages,
  updateProductImage,
} from "@/features/admin/products-api";
import {
  productImageFormSchema,
  type ProductImageFormValues,
} from "@/features/admin/product-components/product-schemas";

function sortedByOrder(images: AdminProductImage[]): AdminProductImage[] {
  return [...images].sort((a, b) => a.display_order - b.display_order);
}

export function ProductImagesTab({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminProductImage | null>(
    null,
  );

  const query = useQuery({
    queryKey: qk.admin.productImages(productId),
    queryFn: () => listProductImages(productId),
  });

  function invalidate() {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: qk.admin.productImages(productId),
      }),
      queryClient.invalidateQueries({ queryKey: qk.admin.product(productId) }),
    ]);
  }

  const setPrimaryMutation = useMutation({
    mutationFn: ({
      imageId,
      isPrimary,
    }: {
      imageId: string;
      isPrimary: boolean;
    }) => updateProductImage(productId, imageId, { is_primary: isPrimary }),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.isPrimary ? "Primary image updated" : "Primary marker cleared",
      );
      await invalidate();
    },
    onError: async (error: ApiError) => {
      if (error.code === "DISPLAY_ORDER_CONFLICT") {
        toast.error(error.message || "Display order conflicts with another image.");
      } else {
        toast.error(error.message || "Could not update the image.");
      }
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(productId, imageId),
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

  const images = query.data ? sortedByOrder(query.data.data) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          The gallery is ordered by display order. The primary image is the
          storefront cover.
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add image
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : images.length === 0 ? (
        <EmptyState
          title="No product images"
          description="Upload a cover image so the product shows up in the storefront."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <li
              key={img.public_id}
              className="group relative overflow-hidden rounded-lg border bg-background"
            >
              <img
                src={img.image_url}
                alt={img.alt_text ?? ""}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="min-w-0 truncate text-xs text-muted-foreground" title={img.alt_text ?? img.image_url}>
                  #{img.display_order}
                  {img.alt_text !== "" && img.alt_text !== null
                    ? ` · ${img.alt_text}`
                    : ""}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for image ${img.display_order}`}
                    >
                      <MoreVertical className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!img.is_primary ? (
                      <DropdownMenuItem
                        disabled={setPrimaryMutation.isPending}
                        onSelect={() =>
                          setPrimaryMutation.mutate({
                            imageId: img.public_id,
                            isPrimary: true,
                          })
                        }
                      >
                        <Star className="size-4" aria-hidden />
                        Set as primary
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        disabled={
                          images.length <= 1 || setPrimaryMutation.isPending
                        }
                        onSelect={() =>
                          setPrimaryMutation.mutate({
                            imageId: img.public_id,
                            isPrimary: false,
                          })
                        }
                      >
                        <StarOff className="size-4" aria-hidden />
                        Clear primary marker
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setPendingDelete(img)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Remove image
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {img.is_primary ? (
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-300">
                  <Star className="size-3 fill-current" aria-hidden />
                  Primary
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AddImageDialog
        productId={productId}
        open={addOpen}
        onOpenChange={setAddOpen}
        existingCount={images.length}
        onAdded={() => invalidate()}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Remove this image?"
        description={
          pendingDelete?.is_primary
            ? "This is the primary image. After removal the image with the lowest display order is promoted to primary automatically."
            : "The image is permanently deleted from the product gallery."
        }
        confirmLabel="Remove image"
        destructive
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteMutation.mutateAsync(pendingDelete.public_id).catch(() => undefined);
        }}
      />
    </div>
  );
}

function AddImageDialog({
  productId,
  open,
  onOpenChange,
  existingCount,
  onAdded,
}: {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCount: number;
  onAdded: () => Promise<unknown>;
}) {
  const [rootError, setRootError] = useState<string | null>(null);

  const form = useForm<ProductImageFormValues>({
    resolver: zodResolver(productImageFormSchema),
    defaultValues: { image_url: "", alt_text: "", display_order: "", is_primary: false },
  });

  const mutation = useMutation({
    mutationFn: (values: ProductImageFormValues) => {
      const order = values.display_order.trim();
      return createProductImage(productId, {
        image_url: values.image_url.trim(),
        ...(values.alt_text.trim() !== ""
          ? { alt_text: values.alt_text.trim() }
          : {}),
        ...(order !== "" ? { display_order: Number(order) } : {}),
        ...(values.is_primary ? { is_primary: true } : {}),
      });
    },
    onSuccess: async () => {
      toast.success("Image added");
      form.reset();
      onOpenChange(false);
      await onAdded();
    },
    onError: (error: ApiError) => {
      if (error.code === "DISPLAY_ORDER_CONFLICT") {
        toast.error(error.message || "Display order conflicts with another image.");
        void onAdded();
        return;
      }
      setRootError(error.message || "Could not add the image.");
    },
  });

  const nextOrder =
    existingCount === 0 ? "" : String(existingCount);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add product image</DialogTitle>
          <DialogDescription>
            Upload a file or paste an image URL. Leave the order blank to append
            at the end.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) => {
            setRootError(null);
            mutation.mutate(values);
          })}
          noValidate
        >
          <div className="flex flex-col gap-4">
            {rootError ? (
              <p role="alert" className="text-sm text-destructive">
                {rootError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-image-url">Image URL</Label>
              <Input
                id="product-image-url"
                placeholder="https://…"
                {...form.register("image_url")}
              />
              {form.formState.errors.image_url ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.image_url.message}
                </p>
              ) : null}
            </div>
            <ImageUploadDropzone
              disabled={mutation.isPending}
              maxFiles={1}
              onUploaded={(urls) => {
                form.setValue("image_url", urls[0] ?? "", {
                  shouldValidate: urls.length > 0,
                });
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-image-alt">Alt text</Label>
                <Input
                  id="product-image-alt"
                  placeholder="Optional"
                  {...form.register("alt_text")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-image-order">Display order</Label>
                <Input
                  id="product-image-order"
                  type="number"
                  min={0}
                  placeholder={nextOrder}
                  {...form.register("display_order")}
                />
                {form.formState.errors.display_order ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.display_order.message}
                  </p>
                ) : null}
              </div>
            </div>
            <Controller
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  Make this the primary image
                </label>
              )}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add image"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
