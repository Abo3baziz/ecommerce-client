"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import { qk } from "@/lib/api/queryKeys";
import { getAdminProduct } from "@/features/admin/products-api";
import { ProductDetailsTab } from "@/features/admin/product-components/product-details-tab";
import { ProductImagesTab } from "@/features/admin/product-components/product-images-tab";
import { ProductVariantsTab } from "@/features/admin/product-components/product-variants-tab";

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-9 w-96" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function ProductEditor({ productId }: { productId: string }) {
  const query = useQuery({
    queryKey: qk.admin.product(productId),
    queryFn: () => getAdminProduct(productId),
  });

  if (query.isPending) {
    return <EditorSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
        className="mt-10"
      />
    );
  }

  const product = query.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {product.name}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono">{product.slug}</span>
          {product.brand ? <span>· {product.brand}</span> : null}
          <span className="font-mono text-xs">{product.public_id}</span>
        </p>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-4">
          <ProductDetailsTab product={product} />
        </TabsContent>
        <TabsContent value="variants" className="pt-4">
          <ProductVariantsTab productId={product.public_id} />
        </TabsContent>
        <TabsContent value="images" className="pt-4">
          <ProductImagesTab productId={product.public_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminProductEditorPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;

  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<EditorSkeleton />}>
        <ProductEditor productId={productId} />
      </Suspense>
    </div>
  );
}
