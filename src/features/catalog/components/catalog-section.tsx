"use client";

import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromStandard } from "@/components/shared/pagination";
import type { PaginationStandard, Product } from "@/types";
import { CatalogControls } from "./catalog-controls";
import { ProductGrid, ProductGridSkeleton } from "./product-grid";
import type { CatalogFiltersController } from "../filters";

interface CatalogResultsProps {
  controller: CatalogFiltersController;
  products: Product[] | undefined;
  pagination: PaginationStandard | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  brandSuggestions?: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function CatalogSection({
  controller,
  products,
  pagination,
  isPending,
  isError,
  error,
  refetch,
  brandSuggestions,
  hasActiveFilters,
  onClearFilters,
}: CatalogResultsProps) {
  const hasTextFilters =
    controller.values.search.trim() !== "" ||
    controller.values.brand.trim() !== "";

  return (
    <div className="flex flex-col gap-6">
      <CatalogControls
        controller={controller}
        brandSuggestions={brandSuggestions}
      />

      {isPending ? (
        <ProductGridSkeleton count={8} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !products || products.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No products found"
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters."
              : "There are no products to show yet. Check back soon."
          }
          action={
            hasTextFilters ? (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ProductGrid products={products} />
          {pagination && pagination.totalPages > 1 ? (
            <PaginationFromStandard
              pagination={{
                page: pagination.page,
                totalPages: pagination.totalPages,
                hasNext: pagination.hasNext,
                hasPrev: pagination.hasPrev,
              }}
              onPageChange={controller.onPageChange}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
