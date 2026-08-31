import type { IsoDateTime } from "./envelopes";
import type { AnalyticsExpenseCategory } from "./admin-analytics";

export type ReportPeriod = "month" | "quarter" | "year" | "custom";
export type ReportGranularity = "auto" | "day" | "month";
export type ReportCurrency = "USD" | "EUR" | "GBP" | "EGP" | "SAR" | "AED";
export type ReportDisposition = "attachment" | "inline";
export const REPORT_PERIODS: readonly ReportPeriod[] = ["month", "quarter", "year", "custom"] as const;
export const REPORT_GRANULARITIES: readonly ReportGranularity[] = ["auto", "day", "month"] as const;
export const REPORT_CURRENCIES: readonly ReportCurrency[] = ["USD", "EUR", "GBP", "EGP", "SAR", "AED"] as const;
export const REPORT_DISPOSITIONS: readonly ReportDisposition[] = ["attachment", "inline"] as const;

export interface ReportWindow {
  from: IsoDateTime;
  to: IsoDateTime;
  label: string;
  bucket: "day" | "month";
  period: ReportPeriod;
}

export interface ReportRange {
  from: IsoDateTime;
  to: IsoDateTime;
}

export interface PnlRevenue {
  product_revenue: string;
  collected_total: string;
  shipping_collected: string;
  tax_collected: string;
  discounts_given: string;
  refunded_total: string;
}

export interface PnlCosts {
  cogs: string;
  operating_expenses: string;
  total_costs: string;
  byCategory: { category: string; total: string }[];
}

export interface PnlProfit {
  gross_profit: string;
  net_profit: string;
  net_margin_pct: string;
}

export interface PnlOrders {
  count: number;
  avg_order_value: string;
}

export interface ReportSeriesPoint {
  bucket_start: IsoDateTime;
  product_revenue: string;
  collected_total: string;
  costs: string;
}

export interface ReportTopProduct {
  product_public_id: string;
  name: string;
  slug: string;
  units: number;
  revenue: string;
  cogs: string;
  gross_margin_pct: string;
}

export interface ReportCategoryShare {
  category_public_id: string;
  name: string;
  revenue: string;
  share_pct: string;
}

export interface ReportCustomers {
  total_active: number;
  new_in_range: number;
  repeat_purchase_pct: string;
}

export interface ReportSalesQuality {
  discounted_orders_pct: string;
  coupons_redeemed: number;
}

export interface PnlReport {
  window: ReportWindow;
  range: ReportRange;
  revenue: PnlRevenue;
  costs: PnlCosts;
  profit: PnlProfit;
  orders: PnlOrders;
  series: ReportSeriesPoint[];
  top_products: ReportTopProduct[];
  category_share: ReportCategoryShare[];
  customers: ReportCustomers;
  sales_quality: ReportSalesQuality;
}

export interface ExpensesReportByCategory {
  category: string;
  total: string;
  share_pct: string;
}

export interface ExpensesReportEntry {
  public_id: string;
  description: string;
  category: string;
  amount: string;
  spent_at: string;
  created_by: string;
}

export interface ExpensesReport {
  window: ReportWindow;
  range: ReportRange;
  totals: { total: string; avgPerDay: string; count: number };
  byCategory: ExpensesReportByCategory[];
  expenses: ExpensesReportEntry[];
}

export interface RevenueReportRevenue {
  product_revenue: string;
  collected_total: string;
  refunded_total: string;
  discounts_given: string;
}

export interface RevenueReport {
  window: ReportWindow;
  range: ReportRange;
  revenue: RevenueReportRevenue;
  orders: PnlOrders;
  series: ReportSeriesPoint[];
  top_products: ReportTopProduct[];
  category_share: ReportCategoryShare[];
}

export interface ReportQueryParams {
  period?: ReportPeriod;
  year?: number;
  month?: number;
  quarter?: number;
  date_from?: string;
  date_to?: string;
  granularity?: ReportGranularity;
  currency?: ReportCurrency;
  disposition?: ReportDisposition;
  format?: "pdf" | "json";
  category?: AnalyticsExpenseCategory;
}
