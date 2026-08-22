"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { qk } from "@/lib/api/queryKeys";
import { createAdminVariant, updateAdminVariant } from "@/features/admin/products-api";
import {
  emptyVariantValues,
  variantFormSchema,
  type VariantFormValues,
} from "@/features/admin/product-components/product-schemas";
import type { AdminVariant, CreateVariantInput } from "@/types/catalog";
import type { ApiError } from "@/types/envelopes";

interface VariantDialogProps {
  productId: string;
  variant: AdminVariant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function valuesFromVariant(variant: AdminVariant): VariantFormValues {
  return {
    sku: variant.sku,
    barcode: variant.barcode ?? "",
    color: variant.color ?? "",
    size: variant.size ?? "",
    price: variant.price,
    cost_price: variant.cost_price ?? "",
    discount_percentage: variant.discount_percentage ?? "",
    weight: variant.weight ?? "",
    length: variant.length ?? "",
    width: variant.width ?? "",
    height: variant.height ?? "",
    status: variant.status ?? "",
  };
}

export function VariantDialog({
  productId,
  variant,
  open,
  onOpenChange,
}: VariantDialogProps) {
  const queryClient = useQueryClient();
  const [rootError, setRootError] = useState<string | null>(null);

  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: variant ? valuesFromVariant(variant) : emptyVariantValues(),
  });

  const mutation = useMutation({
    mutationFn: (values: VariantFormValues) => {
      const t = (v: string) => v.trim();
      if (variant) {
        return updateAdminVariant(productId, variant.public_id, {
          sku: t(values.sku),
          price: t(values.price),
          barcode: t(values.barcode) === "" ? null : t(values.barcode),
          color: t(values.color) === "" ? null : t(values.color),
          size: t(values.size) === "" ? null : t(values.size),
          cost_price: t(values.cost_price) === "" ? null : t(values.cost_price),
          discount_percentage:
            t(values.discount_percentage) === ""
              ? null
              : t(values.discount_percentage),
          weight: t(values.weight) === "" ? null : t(values.weight),
          length: t(values.length) === "" ? null : t(values.length),
          width: t(values.width) === "" ? null : t(values.width),
          height: t(values.height) === "" ? null : t(values.height),
          status: values.status === "" ? null : values.status,
        });
      }
      const payload: CreateVariantInput = {
        sku: t(values.sku),
        price: t(values.price),
      };
      if (values.status !== "") payload.status = values.status;
      if (t(values.barcode) !== "") payload.barcode = t(values.barcode);
      if (t(values.color) !== "") payload.color = t(values.color);
      if (t(values.size) !== "") payload.size = t(values.size);
      if (t(values.cost_price) !== "")
        payload.cost_price = t(values.cost_price);
      if (t(values.discount_percentage) !== "")
        payload.discount_percentage = t(values.discount_percentage);
      if (t(values.weight) !== "") payload.weight = t(values.weight);
      if (t(values.length) !== "") payload.length = t(values.length);
      if (t(values.width) !== "") payload.width = t(values.width);
      if (t(values.height) !== "") payload.height = t(values.height);
      return createAdminVariant(productId, payload);
    },
    onSuccess: async () => {
      toast.success(variant ? "Variant updated" : "Variant created");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: qk.admin.variants(productId),
        }),
        queryClient.invalidateQueries({ queryKey: qk.admin.product(productId) }),
      ]);
      onOpenChange(false);
    },
    onError: (error: ApiError) => {
      if (error.code === "VARIANT_SKU_TAKEN") {
        form.setError("sku", {
          message: error.message || "This SKU is already taken",
        });
        return;
      }
      setRootError(error.message || "Could not save the variant.");
    },
  });

  const moneyField = (
    name: keyof VariantFormValues,
    label: string,
    id: string,
    placeholder?: string,
  ) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        {...form.register(name)}
      />
      {form.formState.errors[name] ? (
        <p className="text-sm text-destructive">
          {form.formState.errors[name]?.message}
        </p>
      ) : null}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(emptyVariantValues());
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{variant ? "Edit variant" : "New variant"}</DialogTitle>
          <DialogDescription>
            Money fields accept decimal strings like 129.99.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => {
          setRootError(null);
          mutation.mutate(values);
        })} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rootError ? (
              <p role="alert" className="text-sm text-destructive sm:col-span-2">
                {rootError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="variant-sku">SKU</Label>
              <Input id="variant-sku" {...form.register("sku")} />
              {form.formState.errors.sku ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sku.message}
                </p>
              ) : null}
            </div>
            {moneyField("barcode", "Barcode", "variant-barcode")}
            {moneyField("color", "Color", "variant-color")}
            {moneyField("size", "Size", "variant-size")}
            {moneyField("price", "Price", "variant-price", "0.00")}
            {moneyField(
              "cost_price",
              "Cost price",
              "variant-cost-price",
              "0.00",
            )}
            {moneyField(
              "discount_percentage",
              "Discount %",
              "variant-discount",
              "0.00",
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="variant-status">Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="variant-status" className="w-full">
                      <SelectValue placeholder="Default (ACTIVE)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        {variant ? "Clear status" : "Default (ACTIVE)"}
                      </SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="mb-2 text-sm font-medium">Dimensions & weight</div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {moneyField("weight", "Weight", "variant-weight", "kg")}
                {moneyField("length", "Length", "variant-length")}
                {moneyField("width", "Width", "variant-width")}
                {moneyField("height", "Height", "variant-height")}
              </div>
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
              {mutation.isPending
                ? "Saving…"
                : variant
                  ? "Save changes"
                  : "Create variant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
