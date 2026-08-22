"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { qk } from "@/lib/api/queryKeys";
import {
  assignAdminCategoryProduct,
  listAdminCategoryProducts,
  unassignAdminCategoryProduct,
} from "@/features/admin/categories-api";
import { listAdminProducts } from "@/features/admin/products-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ApiError } from "@/types/envelopes";

interface CategoryProductsDialogProps {
  categoryId: string;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryProductsDialog({
  categoryId,
  categoryName,
  open,
  onOpenChange,
}: CategoryProductsDialogProps) {
  const queryClient = useQueryClient();
  const [assignedPage, setAssignedPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  async function invalidateAfterLinkChange() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-category-products", categoryId],
    });
    await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    await queryClient.invalidateQueries({ queryKey: qk.category(categoryId) });
  }

  const assignedQuery = useQuery({
    queryKey: qk.admin.categoryProducts(categoryId, { page: assignedPage, limit: 10 }),
    queryFn: () =>
      listAdminCategoryProducts(categoryId, { page: assignedPage, limit: 10 }),
    enabled: open,
  });

  const pickerQuery = useQuery({
    queryKey: qk.admin.products({ search: debouncedSearch, page: 1, limit: 8 }),
    queryFn: () =>
      listAdminProducts({ search: debouncedSearch, page: 1, limit: 8 }),
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: (productId: string) =>
      assignAdminCategoryProduct(categoryId, productId),
    onSuccess: async () => {
      toast.success("Product assigned to category");
      await invalidateAfterLinkChange();
    },
    onError: (error: ApiError) => {
      toast.error(error.message || "Could not assign the product.");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (productId: string) =>
      unassignAdminCategoryProduct(categoryId, productId),
    onSuccess: async () => {
      toast.success("Product removed from category");
      await invalidateAfterLinkChange();
    },
    onError: (error: ApiError) => {
      toast.error(error.message || "Could not remove the product.");
    },
  });

  const assigned = assignedQuery.data?.data ?? [];
  const assignedIds = new Set(assigned.map((product) => product.public_id));
  const pickerResults = (pickerQuery.data?.data ?? []).filter(
    (product) => !assignedIds.has(product.public_id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Products in “{categoryName}”</DialogTitle>
          <DialogDescription>
            Assigning is idempotent — assigning a linked product again is a no-op.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Assigned products</p>
          {assignedQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assignedQuery.isError ? (
            <ErrorState
              error={assignedQuery.error}
              onRetry={() => void assignedQuery.refetch()}
            />
          ) : assigned.length === 0 ? (
            <EmptyState
              title="No products assigned"
              description="Use the picker below to link products to this category."
              className="py-8"
            />
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {assigned.map((product) => (
                  <li
                    key={product.public_id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {product.slug}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={unassignMutation.isPending}
                      onClick={() =>
                        unassignMutation.mutate(product.public_id)
                      }
                    >
                      <X aria-hidden className="size-4" />
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              {assignedQuery.data &&
              assignedQuery.data.pagination.totalPages > 1 ? (
                <PaginationFromStandard
                  pagination={assignedQuery.data.pagination}
                  onPageChange={(page) => setAssignedPage(page)}
                  className="pt-2"
                />
              ) : null}
            </>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Assign a product</p>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchInput}
              placeholder="Search products by name or slug"
              className="pl-8"
              autoComplete="off"
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {pickerQuery.isLoading ? (
            <div className="flex flex-col gap-2 pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : pickerQuery.isError ? (
            <ErrorState
              error={pickerQuery.error}
              onRetry={() => void pickerQuery.refetch()}
            />
          ) : pickerResults.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              No unlinked products match this search.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pickerResults.map((product) => (
                <li
                  key={product.public_id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {product.slug}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={assignMutation.isPending}
                    onClick={() => assignMutation.mutate(product.public_id)}
                  >
                    <Plus aria-hidden className="size-4" />
                    Assign
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {pickerQuery.data && pickerResults.length > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check aria-hidden className="size-3" />
              Showing first {pickerResults.length} result
              {pickerResults.length === 1 ? "" : "s"} for “{debouncedSearch || "all products"}”
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
