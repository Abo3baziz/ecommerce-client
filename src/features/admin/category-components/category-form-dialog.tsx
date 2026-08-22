"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { qk } from "@/lib/api/queryKeys";
import {
  createAdminCategory,
  updateAdminCategory,
} from "@/features/admin/categories-api";
import { slugify } from "@/features/admin/product-components/slugify";
import type { AdminCategory } from "@/types/catalog";
import type { ApiError } from "@/types/envelopes";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Max 255 characters"),
  slug: z
    .string()
    .trim()
    .max(255, "Max 255 characters")
    .refine(
      (v) => v === "" || SLUG_REGEX.test(v),
      "Lowercase letters, numbers and single dashes (e.g. shirts)",
    ),
  description: z.string().trim().max(10000, "Max 10000 characters"),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AdminCategory;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  if (!open) return null;
  return (
    <CategoryFormDialogInner
      key={category?.public_id ?? "new"}
      category={category}
      onOpenChange={onOpenChange}
    />
  );
}

function CategoryFormDialogInner({
  category,
  onOpenChange,
}: {
  category?: AdminCategory;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);
  const [createActive, setCreateActive] = useState(true);
  const isEdit = category !== undefined;

  const emptyValues: CategoryFormValues = {
    name: "",
    slug: "",
    description: "",
  };
  const defaultValues: CategoryFormValues = category
    ? {
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
      }
    : emptyValues;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      if (!category) {
        return createAdminCategory({
          name: values.name,
          ...(values.slug !== "" ? { slug: values.slug } : {}),
          ...(values.description !== ""
            ? { description: values.description }
            : {}),
          is_active: createActive,
        });
      }
      const input: Parameters<typeof updateAdminCategory>[1] = {};
      if (values.name !== defaultValues.name) {
        input.name = values.name;
      }
      if (values.slug !== defaultValues.slug && values.slug !== "") {
        input.slug = values.slug;
      }
      if (values.description !== (category.description ?? "")) {
        input.description =
          values.description === "" ? null : values.description;
      }
      return updateAdminCategory(category.public_id, input);
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Category updated" : "Category created");
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      await queryClient.invalidateQueries({ queryKey: qk.categories() });
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      if (error.code === "CATEGORY_NAME_TAKEN") {
        form.setError("name", {
          message: error.message || "This name is already taken",
        });
        return;
      }
      if (error.code === "CATEGORY_SLUG_TAKEN") {
        form.setError("slug", {
          message: error.message || "This slug is already taken",
        });
        return;
      }
      setRootError(error.message || "Could not save the category.");
    },
  });

  function handleSubmit(values: CategoryFormValues) {
    setRootError(null);
    mutation.mutate(values);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${category?.name}` : "Create category"}
          </DialogTitle>
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
              <Label htmlFor="category-name">Name</Label>
              <Input id="category-name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category-slug">Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="category-slug"
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
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                rows={4}
                {...form.register("description")}
              />
              <p className="text-xs text-muted-foreground">
                Clearing the description removes it on save.
              </p>
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>
            {!isEdit ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="category-active"
                  checked={createActive}
                  onCheckedChange={setCreateActive}
                />
                <Label htmlFor="category-active" className="text-sm font-normal">
                  Visible on the storefront immediately
                </Label>
              </div>
            ) : null}
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
              {mutation.isPending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
