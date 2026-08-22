import { apiRequest } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type {
  CreateReviewInput,
  ProductReviewListParams,
  ProductReviewsPage,
  ReviewBase,
  UpdateReviewInput,
} from "@/types";

export async function getProductReviews(
  productId: string,
  params: ProductReviewListParams = {},
): Promise<ProductReviewsPage> {
  return apiRequest<ProductReviewsPage>({
    url: `/products/${productId}/reviews`,
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 5,
      rating: params.rating ?? undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "created_at", desc: true },
      ),
    },
  });
}

export async function getReview(reviewId: string): Promise<ReviewBase> {
  return apiRequest<ReviewBase>({ url: `/reviews/${reviewId}` });
}

export async function createReview(
  input: CreateReviewInput,
): Promise<ReviewBase> {
  return apiRequest<ReviewBase>({
    url: "/reviews",
    method: "POST",
    data: {
      product_public_id: input.product_public_id,
      rating: input.rating,
      title: input.title || undefined,
      comment: input.comment || undefined,
      images:
        input.images && input.images.length > 0 ? input.images : undefined,
    },
  });
}

export async function updateReview(
  reviewId: string,
  input: UpdateReviewInput,
): Promise<ReviewBase> {
  return apiRequest<ReviewBase>({
    url: `/reviews/${reviewId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiRequest<void>({
    url: `/reviews/${reviewId}`,
    method: "DELETE",
  });
}
