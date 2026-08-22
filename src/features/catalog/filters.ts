"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { ProductListParams } from "@/types";

export type CatalogSortField = NonNullable<ProductListParams["sort"]>;

export interface CatalogFilterValues {
  search: string;
  brand: string;
  sort: CatalogSortField;
  desc: boolean;
  page: number;
}

export const CATALOG_PAGE_SIZE = 20;

const SORT_FIELDS: readonly CatalogSortField[] = [
  "name",
  "created_at",
  "updated_at",
];

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseCatalogFilters(
  searchParams: URLSearchParams,
): CatalogFilterValues {
  const sortRaw = searchParams.get("sort");
  const sort = SORT_FIELDS.find((field) => field === sortRaw) ?? "created_at";
  const dirRaw = searchParams.get("dir");
  return {
    search: searchParams.get("search") ?? "",
    brand: searchParams.get("brand") ?? "",
    sort,
    desc: dirRaw === null ? true : dirRaw !== "false",
    page: parsePositiveInt(searchParams.get("page")) ?? 1,
  };
}

function setParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    params.delete(key);
  } else {
    params.set(key, trimmed);
  }
}

export function catalogQueryParams(
  values: CatalogFilterValues,
): ProductListParams {
  return {
    page: values.page,
    limit: CATALOG_PAGE_SIZE,
    search: values.search.trim() || undefined,
    brand: values.brand.trim() || undefined,
    sort: values.sort,
    desc: values.desc,
  };
}

export function catalogHasActiveFilters(values: CatalogFilterValues): boolean {
  return (
    values.search.trim() !== "" ||
    values.brand.trim() !== "" ||
    values.sort !== "created_at" ||
    !values.desc
  );
}

export interface CatalogFiltersController {
  values: CatalogFilterValues;
  searchDisplay: string;
  onSearchInput: (value: string) => void;
  brandDisplay: string;
  onBrandInput: (value: string) => void;
  onSortChange: (field: CatalogSortField) => void;
  onToggleDirection: () => void;
  onPageChange: (page: number) => void;
}

function useSyncedDisplay(urlValue: string) {
  const [typed, setTyped] = useState<string | null>(null);
  const [syncedUrl, setSyncedUrl] = useState(urlValue);
  if (urlValue !== syncedUrl) {
    setSyncedUrl(urlValue);
    setTyped(null);
  }
  return [typed ?? urlValue, setTyped] as const;
}

export function useCatalogFilters(
  basePath: string,
): CatalogFiltersController {
  const router = useRouter();
  const searchParams = useSearchParams();

  const values = useMemo(
    () => parseCatalogFilters(searchParams),
    [searchParams],
  );

  const applyUpdate = useCallback(
    (updates: Partial<CatalogFilterValues>) => {
      const merged: CatalogFilterValues = { ...values, ...updates };
      const next = new URLSearchParams(Array.from(searchParams.entries()));
      setParam(next, "search", merged.search);
      setParam(next, "brand", merged.brand);
      if (merged.sort !== "created_at") {
        next.set("sort", merged.sort);
      } else {
        next.delete("sort");
      }
      if (!merged.desc) {
        next.set("dir", "false");
      } else {
        next.delete("dir");
      }
      if (updates.page !== undefined && updates.page > 1) {
        next.set("page", String(updates.page));
      } else {
        next.delete("page");
      }
      const query = next.toString();
      router.replace(query ? `${basePath}?${query}` : basePath, {
        scroll: false,
      });
    },
    [basePath, router, searchParams, values],
  );

  const [searchDisplay, setSearchTyped] = useSyncedDisplay(values.search);
  const debouncedSearch = useDebouncedValue(searchDisplay, 300);
  useEffect(() => {
    if (debouncedSearch.trim() === values.search.trim()) return;
    applyUpdate({ search: debouncedSearch });
  }, [applyUpdate, debouncedSearch, values.search]);

  const [brandDisplay, setBrandTyped] = useSyncedDisplay(values.brand);
  const debouncedBrand = useDebouncedValue(brandDisplay, 300);
  useEffect(() => {
    if (debouncedBrand.trim() === values.brand.trim()) return;
    applyUpdate({ brand: debouncedBrand });
  }, [applyUpdate, debouncedBrand, values.brand]);

  const onSortChange = useCallback(
    (field: CatalogSortField) => {
      applyUpdate({ sort: field });
    },
    [applyUpdate],
  );

  const onToggleDirection = useCallback(() => {
    applyUpdate({ desc: !values.desc });
  }, [applyUpdate, values.desc]);

  const onPageChange = useCallback(
    (page: number) => {
      applyUpdate({ page });
    },
    [applyUpdate],
  );

  return {
    values,
    searchDisplay,
    onSearchInput: setSearchTyped,
    brandDisplay,
    onBrandInput: setBrandTyped,
    onSortChange,
    onToggleDirection,
    onPageChange,
  };
}
