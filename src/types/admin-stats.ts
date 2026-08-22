import type { IsoDateTime } from "./envelopes";

export type StatsPeriodPreset = "today" | "7d" | "30d";

export const STATS_PERIOD_PRESETS: readonly StatsPeriodPreset[] = [
  "today",
  "7d",
  "30d",
] as const;

export interface AdminStatsPeriod {
  preset: StatsPeriodPreset;
  from: IsoDateTime;
  to: IsoDateTime;
  bucket: "hour" | "day";
}

export interface AdminStatsRevenue {
  gross_total: string;
  net_total: string;
  refunded_total: string;
  order_count: number;
  avg_order_value: string;
}

export interface AdminStatsSeriesPoint {
  bucket_start: IsoDateTime;
  gross: string;
  net: string;
}

export type AdminOrdersByStatus = Record<
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED"
  | "REFUNDED",
  number
>;

export interface AdminStatsTopProduct {
  product_public_id: string;
  name: string;
  slug: string;
  units: number;
  revenue: string;
}

export interface AdminStatsStockHealth {
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface AdminStatsCustomers {
  total_active: number;
  new_in_period: number;
}

export interface AdminStatsReviews {
  pending_moderation_count: number;
}

export interface AdminStats {
  period: AdminStatsPeriod;
  revenue: AdminStatsRevenue;
  series: AdminStatsSeriesPoint[];
  orders_by_status: AdminOrdersByStatus;
  top_products: AdminStatsTopProduct[];
  stock_health: AdminStatsStockHealth;
  customers: AdminStatsCustomers;
  reviews: AdminStatsReviews;
}
