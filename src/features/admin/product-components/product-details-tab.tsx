"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { qk } from "@/lib/api/queryKeys";
import {
  deleteAdminProduct,
  updateAdminProduct,
} from "@/features/admin/products-api";
import { slugify } from "@/features/admin/product-components/slugify";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/features/admin/product-components/product-schemas";
import type { AdminProductDetail } from "@/types/catalog";
import type { ApiError } from "@/types/envelopes";

export function ProductDetailsTab({ product }: { product: AdminProductDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      brand: product.brand ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      updateAdminProduct(product.public_id, {
        name: values.name,
        slug: values.slug,
        description: values.description === "" ? null : values.description,
        brand: values.brand === "" ? null : values.brand,
      }),
    onSuccess: async () => {
      toast.success("Product updated");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: qk.admin.product(product.public_id),
        }),
        queryClient.invalidateQueries({ queryKey: qk.admin.products() }),
      ]);
    },
    onError: (error: ApiError) => {
      if (error.code === "PRODUCT_SLUG_TAKEN") {
        form.setError("slug", {
          message: error.message || "This slug is already taken",
        });
        return;
      }
      setRootError(error.message || "Could not update the product.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminProduct(product.public_id),
    onSuccess: async () => {
      toast.success("Product deleted");
      await queryClient.invalidateQueries({ queryKey: qk.admin.products() });
      router.replace("/admin/products");
    },
    onError: (error: ApiError) => {
      toast.error(error.message || "Could not delete the product.");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Clearing description or brand removes them from the product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((values) => {
              setRootError(null);
              saveMutation.mutate(values);
            })}
            noValidate
          >
            <div className="flex max-w-xl flex-col gap-4">
              {rootError ? (
                <p role="alert" className="text-sm text-destructive">
                  {rootError}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="details-name">Name</Label>
                <Input id="details-name" {...form.register("name")} />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="details-slug">Slug</Label>
                <div className="flex gap-2">
                  <Input id="details-slug" className="flex-1" {...form.register("slug")} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const name = form.getValues("name");
                      if (name.trim() !== "") {
                        form.setValue("slug", slugify(name), {
                          shouldValidate: true,
                        });
                      }
                    }}
                  >
                    Auto
                  </Button>
                </div>
                {form.formState.errors.slug ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.slug.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="details-brand">Brand</Label>
                <Input id="details-brand" {...form.register("brand")} />
                {form.formState.errors.brand ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.brand.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="details-description">Description</Label>
                <Textarea
                  id="details-description"
                  rows={6}
                  {...form.register("description")}
                />
                {form.formState.errors.description ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                ) : null}
              </div>
              <div>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Deleting this product also soft-deletes all of its variants. The
            storefront stops showing it immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={deleteMutation.isPending}
          >
            Delete product
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this product?"
        description={`"${product.name}" and all of its variants will be soft-deleted and hidden from the store.`}
        confirmLabel="Delete product"
        destructive
        onConfirm={async () => {
          await deleteMutation.mutateAsync().catch(() => undefined);
        }}
      />
    </div>
  );
}
