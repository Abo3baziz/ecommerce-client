import type { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { CategoryClient } from "@/features/catalog/components/category-client";
import { absoluteUrl, breadcrumbJsonLd, collectionPageJsonLd, truncate } from "@/lib/seo";
import type { CategoryDetail } from "@/types";

async function fetchCategory(categoryId: string): Promise<CategoryDetail | null> {
  const apiOrigin = (process.env.API_ORIGIN ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  try {
    const res = await fetch(`${apiOrigin}/api/v1/categories/${categoryId}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: CategoryDetail } | CategoryDetail;
    if (json && typeof json === "object" && "data" in json && (json as { data: CategoryDetail }).data) {
      return (json as { data: CategoryDetail }).data;
    }
    return json as CategoryDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}): Promise<Metadata> {
  const { categoryId } = await params;
  const category = await fetchCategory(categoryId);
  if (!category) {
    return { title: "Category not found", robots: { index: false, follow: false } };
  }
  const description = category.description
    ? truncate(category.description.replace(/\s+/g, " ").trim(), 155)
    : `Browse ${category.name} — ${category.product_count} products in the Storefront catalog.`;
  return {
    title: category.name,
    description,
    alternates: { canonical: `/categories/${category.public_id}` },
    openGraph: {
      title: `${category.name} | Storefront`,
      description,
      url: absoluteUrl(`/categories/${category.public_id}`),
      type: "website",
    },
    keywords: [category.name, category.slug, "category"].filter(Boolean),
  };
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

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const category = await fetchCategory(categoryId);

  const jsonLds: Array<Record<string, unknown>> = [];
  if (category) {
    jsonLds.push(
      collectionPageJsonLd({
        name: category.name,
        description:
          category.description ?? `Browse ${category.name} — ${category.product_count} products.`,
        url: absoluteUrl(`/categories/${category.public_id}`),
      }),
    );
    jsonLds.push(
      breadcrumbJsonLd([
        { name: "Home", url: absoluteUrl("/") },
        { name: "Categories", url: absoluteUrl("/products") },
        { name: category.name, url: absoluteUrl(`/categories/${category.public_id}`) },
      ]),
    );
  }

  return (
    <>
      {jsonLds.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
      <Suspense fallback={<CategoryFallback />}>
        <CategoryClient />
      </Suspense>
    </>
  );
}

// Keep compatibility for client hook that reads params; server fallback already provides SEO.
export function generateViewport() {
  return {};
}
