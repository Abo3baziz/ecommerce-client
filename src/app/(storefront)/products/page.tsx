import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductsClient } from "@/features/catalog/components/products-client";
import { absoluteUrl, breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "All products",
  description:
    "Browse the full product catalog. Filter by brand and search, sort by name or date. Server-authoritative pricing and live stock.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "All products | Storefront",
    description: "Browse the full catalog — filtered, searchable, and up to date.",
    url: absoluteUrl("/products"),
    type: "website",
  },
};

export default function ProductsPage() {
  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          name: "All products",
          description: "Browse the full product catalog — filter by brand and search.",
          url: absoluteUrl("/products"),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Products", url: absoluteUrl("/products") },
        ])}
      />
      <ProductsClient />
    </>
  );
}
