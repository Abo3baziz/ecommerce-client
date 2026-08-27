export const PRODUCTION_URL = "https://ecommerce-storefront-ashy.vercel.app";

function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  // Vercel preview deployments have a per-deployment VERCEL_URL; for SEO we
  // always canonicalize to the production URL to avoid duplicate-content.
  // Only use VERCEL_URL when explicitly building for a non-production target
  // without NEXT_PUBLIC_SITE_URL set — intentionally not default here.
  return PRODUCTION_URL;
}

export const siteConfig = {
  name: "Storefront",
  shortName: "Storefront",
  title: "Storefront — General Supply",
  description:
    "General Supply catalog: browse products by category, search, and check out in minutes. Server-authoritative pricing, curated selection.",
  url: getSiteUrl(),
  locale: "en_US",
  keywords: [
    "ecommerce",
    "storefront",
    "online store",
    "catalog",
    "general supply",
    "shopping",
    "products",
    "categories",
  ],
  author: {
    name: "Ahmed Abdelaziz",
    url: "https://codebyahmed.online",
  },
  twitterHandle: undefined as string | undefined,
  ogImage: "/opengraph-image",
  themeColor: "#0f172a",
} as const;

export function absoluteUrl(path = "/"): string {
  const base = siteConfig.url.replace(/\/+$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}

export function truncate(text: string, max = 155): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

// ---------- JSON-LD builders ----------

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/file.svg`,
  };
}

export interface ProductJsonLdInput {
  name: string;
  description: string | null;
  brand: string | null;
  imageUrls: string[];
  productId: string;
  slug: string;
  price?: string | null;
  currency?: string;
}

export function productJsonLd(input: ProductJsonLdInput) {
  const { name, description, brand, imageUrls, productId, slug, price, currency = "USD" } = input;
  const url = absoluteUrl(`/products/${productId}`);

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url,
    sku: productId,
    mpn: productId,
    slug,
  };

  if (description) base.description = truncate(description, 5000);
  if (brand) base.brand = { "@type": "Brand", name: brand };
  if (imageUrls.length > 0) base.image = imageUrls;

  if (price) {
    base.offers = {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    };
  } else {
    base.offers = {
      "@type": "AggregateOffer",
      availability: "https://schema.org/InStock",
      priceCurrency: currency,
    };
  }

  return base;
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url,
    isPartOf: { "@id": `${siteConfig.url}#website` },
  };
}
