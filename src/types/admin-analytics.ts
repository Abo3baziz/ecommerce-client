import type { IsoDateTime } from "./envelopes";

export type AnalyticsExpenseCategory =
  | "RENT"
  | "SALARIES"
  | "MARKETING"
  | "UTILITIES"
  | "SHIPPING"
  | "SOFTWARE"
  | "OTHER";

export const ANALYTICS_EXPENSE_CATEGORIES: readonly AnalyticsExpenseCategory[] =
  ["RENT", "SALARIES", "MARKETING", "UTILITIES", "SHIPPING", "SOFTWARE", "OTHER"];

export interface AdminAnalyticsRange {
  from: IsoDateTime;
  to: IsoDateTime;
}

export interface AdminAnalyticsRevenue {
  product_revenue: string;
  collected_total: string;
  shipping_collected: string;
  tax_collected: string;
  discounts_given: string;
  refunded_total: string;
}

export interface AdminAnalyticsCosts {
  cogs: string;
  operating_expenses: string;
  total_costs: string;
}

export interface AdminAnalyticsProfit {
  gross_profit: string;
  net_profit: string;
  net_margin_pct: string;
}

export interface AdminAnalyticsOrders {
  count: number;
  avg_order_value: string;
}

export interface AdminAnalyticsSeriesPoint {
  bucket_start: IsoDateTime;
  product_revenue: string;
  collected_total: string;
  costs: string;
}

export interface AdminAnalyticsTopProduct {
  product_public_id: string;
  name: string;
  slug: string;
  units: number;
  revenue: string;
  cogs: string;
  gross_margin_pct: string;
}

export interface AdminAnalyticsCategoryShare {
  category_public_id: string;
  name: string;
  revenue: string;
  share_pct: string;
}

export interface AdminAnalyticsCustomers {
  total_active: number;
  new_in_range: number;
  repeat_purchase_pct: string;
}

export interface AdminAnalyticsSalesQuality {
  discounted_orders_pct: string;
  coupons_redeemed: number;
}

export interface AdminAnalyticsOverview {
  range: AdminAnalyticsRange;
  revenue: AdminAnalyticsRevenue;
  costs: AdminAnalyticsCosts;
  profit: AdminAnalyticsProfit;
  orders: AdminAnalyticsOrders;
  series: AdminAnalyticsSeriesPoint[];
  top_products: AdminAnalyticsTopProduct[];
  category_share: AdminAnalyticsCategoryShare[];
  customers: AdminAnalyticsCustomers;
  sales_quality: AdminAnalyticsSalesQuality;
}

export type CouponDiscountTypeV2 = "FIXED_AMOUNT" | "PERCENTAGE";

export interface AdminCouponAnalyticsTotals {
  total_coupons: number;
  active_coupons: number;
  inactive_coupons: number;
  expired_coupons: number;
  usage_limit_reached: number;
  lifetime_redemptions: number;
  range_redemptions: number;
  discounts_given_in_range: string;
  coupon_orders_count: number;
  coupon_orders_revenue: string;
  coupon_orders_share_pct: string;
}

export interface AdminCouponMostUsed {
  coupon_public_id: string;
  code: string;
  discount_type: CouponDiscountTypeV2;
  discount_value: string;
  is_active: boolean;
  lifetime_uses: number;
  range_redemptions: number;
  discounts_given_in_range: string;
}

export interface AdminCouponTrendPoint {
  date: string;
  redemptions: number;
  discount_amount: string;
}

export interface AdminCouponAnalytics {
  range: AdminAnalyticsRange;
  totals: AdminCouponAnalyticsTotals;
  most_used: AdminCouponMostUsed[];
  trend: AdminCouponTrendPoint[];
}

export interface AdminCouponAnalyticsParams {
  date_from?: string;
  date_to?: string;
}

export interface AdminAnalyticsOverviewParams {
  date_from?: string;
  date_to?: string;
}

export interface OperatingExpense {
  public_id: string;
  description: string;
  category: AnalyticsExpenseCategory;
  amount: string;
  spent_at: string;
  created_by: { id: number; name: string };
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface OperatingExpenseListParams {
  page?: number;
  limit?: number;
  category?: AnalyticsExpenseCategory;
  date_from?: string;
  date_to?: string;
}

export interface CreateOperatingExpenseInput {
  description: string;
  category: AnalyticsExpenseCategory;
  amount: number;
  spent_at: string;
}

export type UpdateOperatingExpenseInput = Partial<CreateOperatingExpenseInput>;
