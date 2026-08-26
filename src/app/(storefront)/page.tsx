"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

  const categoryCount = categories.data?.length ?? null;
  const productTotal = latest.data?.pagination.total ?? null;

  return (
    <div className="flex flex-col gap-14">
      <section className="border-b pb-10">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h1 className="font-heading max-w-3xl text-6xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Everything you need, in one storefront
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
              Browse the catalog by category, find exactly what you need, and
              check out in minutes.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className={cn(buttonVariants({ size: "lg" }), "rounded-none font-mono text-sm uppercase tracking-[0.12em]")}
              >
                Shop all products
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </div>

          <dl className="border bg-card">
            <p className="label-caps border-b bg-secondary px-4 py-2 text-foreground">
              Catalog sheet
            </p>
            <div className="flex items-baseline justify-between border-b px-4 py-3 last:border-b-0">
              <dt className="label-caps">Products</dt>
              <dd className="font-mono text-sm tabular-nums">
                {productTotal === null ? (
                  <span className="inline-block h-4 w-12 animate-pulse bg-muted align-middle" aria-label="Loading count" />
                ) : (
                  productTotal.toLocaleString("en-US")
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-b px-4 py-3 last:border-b-0">
              <dt className="label-caps">Categories</dt>
              <dd className="font-mono text-sm tabular-nums">
                {categoryCount === null ? (
                  <span className="inline-block h-4 w-8 animate-pulse bg-muted align-middle" aria-label="Loading count" />
                ) : (
                  categoryCount.toLocaleString("en-US")
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-b px-4 py-3 last:border-b-0">
              <dt className="label-caps">Checkout</dt>
              <dd className="font-mono text-sm tabular-nums">3 steps</dd>
            </div>
            <div className="flex items-baseline justify-between px-4 py-3">
              <dt className="label-caps">Pricing</dt>
              <dd className="font-mono text-sm">Server-authoritative</dd>
            </div>
          </dl>
        </div>

        <div aria-hidden className="mt-10 flex h-9 w-full max-w-md text-foreground/60">
          <div className="barcode-strip flex-1" />
          <p className="label-caps ml-3 self-center whitespace-nowrap">
            SF · General catalog
          </p>
        </div>
      </section>

      <section aria-labelledby="home-categories" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="home-categories" className="font-heading text-3xl font-semibold uppercase tracking-tight">
            Shop by category
          </h2>
        </div>
        {categories.isPending ? (
          <div aria-hidden className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-10 w-32 rounded-none" />
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
        ) : !categories.data || categories.data.length === 0 ? null : (
          <div className="-mx-1 flex flex-wrap gap-2 px-1">
            {categories.data.map((category) => (
              <Link
                key={category.public_id}
                href={`/categories/${category.public_id}`}
                className="rack-sign"
              >
                {category.name}
                <ArrowRight
                  aria-hidden
                  className="size-3.5 text-muted-foreground transition-transform duration-200 [transition-timing-function:var(--ease-ballistic)] group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section
        aria-labelledby="home-latest"
        className="flex flex-col gap-4"
      >
        <div className="flex items-baseline justify-between border-b pb-3">
          <h2 id="home-latest" className="font-heading text-3xl font-semibold uppercase tracking-tight">
            Latest products
          </h2>
          <Link
            href="/products"
            className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            View all →
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
