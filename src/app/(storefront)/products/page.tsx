"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  catalogHasActiveFilters,
  catalogQueryParams,
  useCatalogFilters,
} from "@/features/catalog/filters";
import { useProducts } from "@/features/catalog/hooks";
import { CatalogSection } from "@/features/catalog/components/catalog-section";

function ProductsBrowser() {
  const router = useRouter();
  const controller = useCatalogFilters("/products");
  const productsQuery = useProducts(catalogQueryParams(controller.values));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">All products</h1>
        <p className="text-sm text-muted-foreground">
          {productsQuery.data
            ? `${productsQuery.data.pagination.total} ${
                productsQuery.data.pagination.total === 1
                  ? "product"
                  : "products"
              }`
            : "Browse the full catalog."}
        </p>
      </header>

      <CatalogSection
        controller={controller}
        products={productsQuery.data?.data}
        pagination={productsQuery.data?.pagination}
        isPending={productsQuery.isPending}
        isError={productsQuery.isError}
        error={productsQuery.error}
        refetch={() => void productsQuery.refetch()}
        brandSuggestions={(productsQuery.data?.data ?? [])
          .map((product) => product.brand)
          .filter((brand): brand is string => brand !== null)}
        onClearFilters={() => router.replace("/products", { scroll: false })}
        hasActiveFilters={catalogHasActiveFilters(controller.values)}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsBrowser />
    </Suspense>
  );
}

function ProductsFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="flex flex-wrap gap-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
