"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { qk } from "@/lib/api/queryKeys";
import { createAdminInventoryRecord } from "@/features/admin/inventory-api";
import { getAdminProduct, listAdminProducts } from "@/features/admin/products-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { VariantId } from "@/types/catalog";
import type { ApiError } from "@/types/envelopes";

const UNSIGNED_INT_PATTERN = /^\d+$/;

function variantLabel(
  sku: string,
  color: string | null,
  size: string | null,
): string {
  const parts = [sku];
  if (color) parts.push(color);
  if (size) parts.push(size);
  return parts.join(" · ");
}

interface CreateInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInventoryDialog({
  open,
  onOpenChange,
}: CreateInventoryDialogProps) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [productId, setProductId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<VariantId | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);

  function reset() {
    setSearchInput("");
    setProductId(null);
    setVariantId(null);
    setQuantity("");
    setReorderLevel("");
    setRootError(null);
  }

  const productsQuery = useQuery({
    queryKey: qk.admin.products({ search: debouncedSearch, page: 1, limit: 8 }),
    queryFn: () => listAdminProducts({ search: debouncedSearch, page: 1, limit: 8 }),
    enabled: open,
  });

  const variantsQuery = useQuery({
    queryKey: productId ? qk.admin.product(productId) : ["admin-product", "none"],
    queryFn: () => getAdminProduct(productId ?? ""),
    enabled: open && productId !== null,
  });

  const quantityValid =
    UNSIGNED_INT_PATTERN.test(quantity) && Number(quantity) >= 0;
  const reorderTrimmed = reorderLevel.trim();
  const reorderValid =
    reorderTrimmed === "" || UNSIGNED_INT_PATTERN.test(reorderTrimmed);
  const canSubmit = variantId !== null && quantityValid && reorderValid;

  const mutation = useMutation({
    mutationFn: () => {
      if (variantId === null) {
        return Promise.reject(
          new Error("Select a variant before creating a record."),
        );
      }
      return createAdminInventoryRecord({
        variant_public_id: variantId,
        quantity_on_hand: Number(quantity),
        ...(reorderTrimmed !== "" ? { reorder_level: Number(reorderTrimmed) } : {}),
      });
    },
    onSuccess: async () => {
      toast.success("Inventory record created");
      await queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      reset();
      onOpenChange(false);
    },
    onError: async (error: ApiError) => {
      if (error.status === 409) {
        setRootError(
          error.message ||
            "This variant already has an inventory record. Adjust it instead.",
        );
        return;
      }
      setRootError(error.message || "Could not create the inventory record.");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create inventory record</DialogTitle>
          <DialogDescription>
            Inventory records are never auto-created — pick a variant that does
            not have stock tracked yet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {rootError ? (
            <p role="alert" className="text-sm text-destructive">
              {rootError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="inventory-product-search">Find a product</Label>
            <Input
              id="inventory-product-search"
              value={searchInput}
              placeholder="Search by name or slug"
              autoComplete="off"
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {productsQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : productsQuery.isError ? (
            <ErrorState
              error={productsQuery.error}
              onRetry={() => void productsQuery.refetch()}
            />
          ) : (productsQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              title="No products match"
              description="Try a different search term."
              className="py-6"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(productsQuery.data?.data ?? []).map((product) => (
                <Button
                  key={product.public_id}
                  type="button"
                  size="sm"
                  variant={productId === product.public_id ? "default" : "outline"}
                  onClick={() => {
                    setProductId(product.public_id);
                    setVariantId(null);
                    setRootError(null);
                  }}
                >
                  {product.name}
                </Button>
              ))}
            </div>
          )}

          {productId !== null ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-variant">Variant</Label>
              {variantsQuery.isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : variantsQuery.isError ? (
                <ErrorState
                  error={variantsQuery.error}
                  onRetry={() => void variantsQuery.refetch()}
                />
              ) : (variantsQuery.data?.variants ?? []).length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
                  This product has no variants. Add one in the product editor
                  first.
                </p>
              ) : (
                <Select
                  value={variantId ?? ""}
                  onValueChange={(value) => setVariantId(value as VariantId)}
                >
                  <SelectTrigger id="inventory-variant">
                    <SelectValue placeholder="Select a variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {(variantsQuery.data?.variants ?? []).map((variant) => (
                      <SelectItem key={variant.public_id} value={variant.public_id}>
                        {variantLabel(variant.sku, variant.color, variant.size)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-quantity">Initial on hand</Label>
              <Input
                id="inventory-quantity"
                inputMode="numeric"
                value={quantity}
                placeholder="≥ 0"
                autoComplete="off"
                onChange={(e) => setQuantity(e.target.value)}
              />
              {!quantityValid && quantity !== "" ? (
                <p className="text-sm text-destructive">
                  Enter a whole number ≥ 0.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="inventory-reorder">Reorder level</Label>
              <Input
                id="inventory-reorder"
                inputMode="numeric"
                value={reorderLevel}
                placeholder="Optional"
                autoComplete="off"
                onChange={(e) => setReorderLevel(e.target.value)}
              />
              {!reorderValid ? (
                <p className="text-sm text-destructive">
                  Enter a whole number ≥ 0.
                </p>
              ) : null}
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
          <Button
            type="button"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating…" : "Create record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
