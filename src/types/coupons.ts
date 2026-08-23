import type { IsoDateTime } from "./envelopes";

export type CouponDiscountType = "FIXED_AMOUNT" | "PERCENTAGE";

export type CouponStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "EXPIRED"
  | "USAGE_LIMIT_REACHED";

export interface AdminCoupon {
  public_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: string;
  minimum_order_amount: string | null;
  maximum_discount_amount: string | null;
  usage_limit: number;
  usage_limit_per_user: number;
  usage_count: number;
  starts_at: IsoDateTime | null;
  expires_at: IsoDateTime | null;
  is_active: boolean;
  deleted_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  status: CouponStatus;
}

export const COUPON_STATUSES: readonly CouponStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "USAGE_LIMIT_REACHED",
] as const;

export interface AdminCouponListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CouponStatus;
  include_deleted?: boolean;
  sort?: string;
}

export interface CreateCouponInput {
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  usage_limit: number;
  usage_limit_per_user: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
}

export interface UpdateCouponInput {
  code?: string;
  discount_type?: CouponDiscountType;
  discount_value?: number;
  minimum_order_amount?: number | null;
  maximum_discount_amount?: number | null;
  usage_limit?: number;
  usage_limit_per_user?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

export interface AdminCouponUsage {
  order_public_id: string;
  order_number: string;
  customer_public_id: string;
  customer_name: string;
  customer_email: string;
  discount_amount: string;
  redeemed_at: IsoDateTime;
}
