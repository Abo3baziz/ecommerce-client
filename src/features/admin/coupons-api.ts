import { apiRequest } from "@/lib/api/client";
import type {
  AdminCoupon,
  AdminCouponListParams,
  AdminCouponUsage,
  CreateCouponInput,
  Paginated,
  UpdateCouponInput,
} from "@/types";

export async function listAdminCoupons(
  params: AdminCouponListParams = {},
): Promise<Paginated<AdminCoupon>> {
  return apiRequest<Paginated<AdminCoupon>>({
    url: "/admin/coupons",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      status: params.status || undefined,
      include_deleted: params.include_deleted ? true : undefined,
      sort: params.sort || "-created_at",
    },
  });
}

export async function createCoupon(
  input: CreateCouponInput,
): Promise<AdminCoupon> {
  return apiRequest<AdminCoupon>({
    url: "/admin/coupons",
    method: "POST",
    data: input,
  });
}

export async function updateCoupon(
  couponId: string,
  input: UpdateCouponInput,
): Promise<AdminCoupon> {
  return apiRequest<AdminCoupon>({
    url: `/admin/coupons/${couponId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteCoupon(couponId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/coupons/${couponId}`,
    method: "DELETE",
  });
}

export async function listCouponUsages(
  couponId: string,
  page = 1,
): Promise<Paginated<AdminCouponUsage>> {
  return apiRequest<Paginated<AdminCouponUsage>>({
    url: `/admin/coupons/${couponId}/usages`,
    params: { page, limit: 10 },
  });
}
