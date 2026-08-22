"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import {
  useCategories,
  useProducts,
} from "@/features/catalog/hooks";
import { ProductGrid, ProductGridSkeleton } from "@/features/catalog/components/product-grid";

const LATEST_PRODUCTS_COUNT = 8;

export default function HomePage() {
  const categories = useCategories();
  const latest = useProducts({
    page: 1,
    limit: LATEST_PRODUCTS_COUNT,
    sort: "created_at",
    desc: true,
  });

  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col items-center gap-4 py-10 text-center sm:py-16">
        <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Everything you need, in one storefront
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Browse the catalog by category, find exactly what you need, and
          check out in minutes.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/products" className={buttonVariants({ size: "lg" })}>
            Shop all products
          </Link>
        </div>
      </section>

      <section aria-labelledby="home-categories" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="home-categories" className="text-xl font-semibold tracking-tight">
            Shop by category
          </h2>
        </div>
        {categories.isPending ? (
          <div aria-hidden className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-8 w-28 rounded-full" />
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
        ) : !categories.data || categories.data.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            {categories.data.map((category) => (
              <Link
                key={category.public_id}
                href={`/categories/${category.public_id}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-full",
                )}
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section
        aria-labelledby="home-latest"
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="home-latest" className="text-xl font-semibold tracking-tight">
            Latest products
          </h2>
          <Link
            href="/products"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            View all
          </Link>
        </div>
        {latest.isPending ? (
          <ProductGridSkeleton count={LATEST_PRODUCTS_COUNT} />
        ) : latest.isError ? (
          <ErrorState
            error={latest.error}
            onRetry={() => void latest.refetch()}
          />
        ) : !latest.data || latest.data.data.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Products will appear here as soon as they're published."
          />
        ) : (
          <ProductGrid products={latest.data.data} />
        )}
      </section>
    </div>
  );
}
