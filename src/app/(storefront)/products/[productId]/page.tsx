import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductDetailView } from "@/features/catalog/components/product-detail-view";
import { absoluteUrl, breadcrumbJsonLd, productJsonLd, truncate } from "@/lib/seo";
import type { ProductDetail } from "@/types";

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

async function fetchProduct(productId: string): Promise<ProductDetail | null> {
  const apiOrigin = (process.env.API_ORIGIN ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  try {
    const res = await fetch(`${apiOrigin}/api/v1/products/${productId}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: ProductDetail } | ProductDetail;
    if (json && typeof json === "object" && "data" in json && (json as { data: ProductDetail }).data) {
      return (json as { data: ProductDetail }).data;
    }
    return json as ProductDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  const product = await fetchProduct(productId);

  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  const description = product.description
    ? truncate(product.description.replace(/\s+/g, " ").trim(), 155)
    : `${product.name}${product.brand ? ` by ${product.brand}` : ""} — available in the Storefront catalog.`;

  const url = absoluteUrl(`/products/${product.public_id}`);
  const images = [...product.images]
    .sort((a, b) => a.display_order - b.display_order)
    .map((i) => ({ url: i.image_url, alt: i.alt_text ?? product.name }));

  const primaryImage = images[0]?.url;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.public_id}` },
    openGraph: {
      type: "website",
      url,
      title: product.name,
      description,
      images: primaryImage ? [{ url: primaryImage, alt: product.name, width: 800, height: 800 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: primaryImage ? [primaryImage] : undefined,
    },
    keywords: [product.name, product.brand ?? "", product.slug].filter(Boolean),
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await fetchProduct(productId);

  const jsonLds: Array<Record<string, unknown>> = [];
  if (product) {
    const variant = product.variants[0] ?? null;
    jsonLds.push(
      productJsonLd({
        name: product.name,
        description: product.description,
        brand: product.brand,
        imageUrls: [...product.images].sort((a, b) => a.display_order - b.display_order).map((i) => i.image_url),
        productId: product.public_id,
        slug: product.slug,
        price: variant?.final_price ?? variant?.price ?? null,
      }),
    );
    jsonLds.push(
      breadcrumbJsonLd([
        { name: "Home", url: absoluteUrl("/") },
        { name: "Products", url: absoluteUrl("/products") },
        { name: product.name, url: absoluteUrl(`/products/${product.public_id}`) },
      ]),
    );
  }

  return (
    <>
      {jsonLds.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Suspense fallback={<ProductFallback />}>
        <ProductDetailView />
      </Suspense>
    </>
  );
}
