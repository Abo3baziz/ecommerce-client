import { apiRequest } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type {
  AdminReviewDetail,
  AdminReviewListParams,
  AdminReviewsPage,
  UpdateReviewModerationInput,
} from "@/types";

export async function listAdminReviews(
  params: AdminReviewListParams = {},
): Promise<AdminReviewsPage> {
  return apiRequest<AdminReviewsPage>({
    url: "/admin/reviews",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search || undefined,
      rating: params.rating || undefined,
      is_approved:
        params.is_approved === "all" || params.is_approved === undefined
          ? undefined
          : params.is_approved,
      include_deleted: params.include_deleted ? true : undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "created_at", desc: true },
      ),
    },
  });
}

export async function getAdminReview(
  reviewId: string,
): Promise<AdminReviewDetail> {
  return apiRequest<AdminReviewDetail>({
    url: `/admin/reviews/${reviewId}`,
  });
}

export async function moderateAdminReview(
  reviewId: string,
  input: UpdateReviewModerationInput,
): Promise<AdminReviewDetail> {
  return apiRequest<AdminReviewDetail>({
    url: `/admin/reviews/${reviewId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteAdminReview(reviewId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/reviews/${reviewId}`,
    method: "DELETE",
  });
}
