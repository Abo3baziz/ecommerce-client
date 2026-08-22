"use client";

import { useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { ProductReviewListParams } from "@/types";
import { getProductReviews, getReview } from "./api";

function retryUnlessGone(failureCount: number, error: unknown): boolean {
  const status = normalizeApiError(error).status;
  if (status === 404 || status === 400) return false;
  return failureCount < 3;
}

export function useProductReviews(
  productId: string,
  params: ProductReviewListParams = {},
) {
  return useQuery({
    queryKey: qk.productReviews(productId, params),
    queryFn: () => getProductReviews(productId, params),
    enabled: Boolean(productId),
    retry: retryUnlessGone,
  });
}

export function useReview(reviewId: string) {
  return useQuery({
    queryKey: qk.review(reviewId),
    queryFn: () => getReview(reviewId),
    enabled: Boolean(reviewId),
    retry: retryUnlessGone,
  });
}
