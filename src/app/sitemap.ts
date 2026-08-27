import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

const STATIC_PATHS = [
  "/",
  "/products",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/verify-email-change",
] as const;

type ApiPaginated<T> = {
  success: true;
  data: T[];
  pagination?: { total?: number };
};

type ProductLike = { public_id: string; updated_at?: string };
type CategoryLike = { public_id: string; updated_at?: string };

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/+$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : ("weekly" as const),
    priority: path === "/" ? 1 : path === "/products" ? 0.9 : 0.5,
  }));

  const apiOrigin = (process.env.API_ORIGIN ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  const dynamicEntries: MetadataRoute.Sitemap = [];

  // Products — cap to 500 to avoid build-time blowup; sitemap is truncated by design.
  const productsJson = await fetchJson<ApiPaginated<ProductLike>>(
    `${apiOrigin}/api/v1/products?limit=100&page=1`,
  );
  const productIds = productsJson?.data ?? [];
  for (const p of productIds) {
    dynamicEntries.push({
      url: `${base}/products/${p.public_id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Categories
  const categoriesJson = await fetchJson<ApiPaginated<CategoryLike>>(
    `${apiOrigin}/api/v1/categories?limit=100&page=1`,
  );
  const categoryIds = categoriesJson?.data ?? [];
  for (const c of categoryIds) {
    dynamicEntries.push({
      url: `${base}/categories/${c.public_id}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return [...staticEntries, ...dynamicEntries];
}
