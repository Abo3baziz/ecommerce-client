import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { HomeClient } from "@/features/catalog/components/home-client";
import { absoluteUrl, breadcrumbJsonLd, collectionPageJsonLd, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Everything you need, in one storefront",
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.title }],
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          name: "General Supply Catalog",
          description: siteConfig.description,
          url: absoluteUrl("/"),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Home", url: absoluteUrl("/") }])}
      />
      <HomeClient />
    </>
  );
}
