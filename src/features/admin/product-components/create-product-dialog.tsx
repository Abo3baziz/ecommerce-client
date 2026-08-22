"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { qk } from "@/lib/api/queryKeys";
import { createAdminProduct } from "@/features/admin/products-api";
import { slugify } from "@/features/admin/product-components/slugify";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/features/admin/product-components/product-schemas";
import type { ApiError } from "@/types/envelopes";

const emptyValues: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  brand: "",
};

export function CreateProductDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyValues,
  });

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const input = {
        name: values.name,
        ...(values.slug !== "" ? { slug: values.slug } : {}),
        ...(values.description !== "" ? { description: values.description } : {}),
        ...(values.brand !== "" ? { brand: values.brand } : {}),
      };
      return createAdminProduct(input);
    },
    onSuccess: async () => {
      toast.success("Product created");
      await queryClient.invalidateQueries({ queryKey: qk.admin.products() });
      onOpenChange(false);
      form.reset(emptyValues);
    },
    onError: (error: ApiError) => {
      if (error.code === "PRODUCT_SLUG_TAKEN") {
        form.setError("slug", {
          message: error.message || "This slug is already taken",
        });
        return;
      }
      setRootError(error.message || "Could not create the product.");
    },
  });

  function handleSubmit(values: ProductFormValues) {
    setRootError(null);
    mutation.mutate(values);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset(emptyValues);
          setRootError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create product</DialogTitle>
          <DialogDescription>
            Slug is auto-generated when left blank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <div className="flex flex-col gap-4">
            {rootError ? (
              <p role="alert" className="text-sm text-destructive">
                {rootError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-product-name">Name</Label>
              <Input id="create-product-name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-product-slug">Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="create-product-slug"
                  className="flex-1"
                  {...form.register("slug")}
                />
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
              <Label htmlFor="create-product-brand">Brand</Label>
              <Input id="create-product-brand" {...form.register("brand")} />
              {form.formState.errors.brand ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.brand.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-product-description">Description</Label>
              <Textarea
                id="create-product-description"
                rows={4}
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
