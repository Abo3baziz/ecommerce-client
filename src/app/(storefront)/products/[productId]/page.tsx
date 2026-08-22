"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDetailView } from "@/features/catalog/components/product-detail-view";

function ProductFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-10">
      <Skeleton className="h-4 w-64" />
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-lg lg:w-[45%]" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductFallback />}>
      <ProductDetailView />
    </Suspense>
  );
}
