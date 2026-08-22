"use client";

import { useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ProductListParams } from "@/types";
import {
  getCategory,
  listCategories,
  listCategoryProducts,
  listProducts,
  getProduct,
} from "./api";

export function useCategories() {
  return useQuery({
    queryKey: qk.categories({ limit: 100 }),
    queryFn: () => listCategories({ limit: 100 }),
    select: (page) => page.data,
    staleTime: 5 * 60_000,
  });
}

function retryUnlessGone(failureCount: number, error: unknown): boolean {
  const status = normalizeApiError(error).status;
  if (status === 404 || status === 400) return false;
  return failureCount < 3;
}

export function useCategory(categoryId: string) {
  return useQuery({
    queryKey: qk.category(categoryId),
    queryFn: () => getCategory(categoryId),
    enabled: Boolean(categoryId),
    retry: retryUnlessGone,
  });
}

export function useCategoryProducts(
  categoryId: string,
  params: ProductListParams = {},
) {
  return useQuery({
    queryKey: qk.categoryProducts(categoryId, params),
    queryFn: () => listCategoryProducts(categoryId, params),
    enabled: Boolean(categoryId),
    placeholderData: (previous) => previous,
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: qk.product(productId),
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
    retry: retryUnlessGone,
  });
}

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: qk.products(params),
    queryFn: () => listProducts(params),
    placeholderData: (previous) => previous,
  });
}
