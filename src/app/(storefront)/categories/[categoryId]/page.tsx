"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { normalizeApiError } from "@/lib/api/client";
import {
  catalogHasActiveFilters,
  catalogQueryParams,
  useCatalogFilters,
} from "@/features/catalog/filters";
import { useCategory, useCategoryProducts } from "@/features/catalog/hooks";
import { CatalogSection } from "@/features/catalog/components/catalog-section";
import { ProductGridSkeleton } from "@/features/catalog/components/product-grid";

function CategoryProductsBrowser({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const basePath = `/categories/${categoryId}`;
  const controller = useCatalogFilters(basePath);
  const productsQuery = useCategoryProducts(
    categoryId,
    catalogQueryParams(controller.values),
  );

  return (
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
      hasActiveFilters={catalogHasActiveFilters(controller.values)}
      onClearFilters={() => router.replace(basePath, { scroll: false })}
    />
  );
}

function CategoryView() {
  const params = useParams<{ categoryId: string | string[] }>();
  const rawId = params.categoryId;
  const categoryId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
        ? (rawId[0] ?? "")
        : "";

  const categoryQuery = useCategory(categoryId);

  if (!categoryId) {
    return (
      <EmptyState
        title="Category not found"
        description="This category doesn't exist or is no longer available."
        action={
          <Link
            href="/products"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Browse all products
          </Link>
        }
      />
    );
  }

  if (categoryQuery.isPending) {
    return (
      <div aria-hidden className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    );
  }

  if (categoryQuery.isError) {
    const status = normalizeApiError(categoryQuery.error).status;
    if (status === 404 || status === 400) {
      return (
        <EmptyState
          title="Category not found"
          description="This category doesn't exist or is no longer available."
          action={
            <Link
              href="/products"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Browse all products
            </Link>
          }
        />
      );
    }
    return (
      <ErrorState
        error={categoryQuery.error}
        onRetry={() => void categoryQuery.refetch()}
      />
    );
  }

  const category = categoryQuery.data;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {category.name}
          </h1>
          <Badge variant="secondary">
            {category.product_count}{" "}
            {category.product_count === 1 ? "product" : "products"}
          </Badge>
        </div>
        {category.description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {category.description}
          </p>
        ) : null}
      </header>
      <CategoryProductsBrowser categoryId={categoryId} />
    </div>
  );
}

export default function CategoryDetailPage() {
  return (
    <Suspense fallback={<CategoryFallback />}>
      <CategoryView />
    </Suspense>
  );
}

function CategoryFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-wrap gap-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
