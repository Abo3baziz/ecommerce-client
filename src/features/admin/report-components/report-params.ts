import type { ReportQueryParams, ReportPeriod, ReportGranularity, ReportCurrency } from "@/types/admin-reports";
import type { AnalyticsExpenseCategory } from "@/types/admin-analytics";

export const REPORT_CURRENCIES: readonly ReportCurrency[] = ["USD", "EUR", "GBP", "EGP", "SAR", "AED"] as const;
export const REPORT_PERIODS: readonly ReportPeriod[] = ["month", "quarter", "year", "custom"] as const;
export const REPORT_GRANULARITIES: readonly ReportGranularity[] = ["auto", "day", "month"] as const;

export function parseReportParams(searchParams: URLSearchParams): ReportQueryParams {
  const period = (searchParams.get("period") as ReportPeriod | null) ?? "month";
  const granularity = (searchParams.get("granularity") as ReportGranularity | null) ?? "auto";
  const currency = (searchParams.get("currency") as ReportCurrency | null) ?? "USD";
  const category = searchParams.get("category") as AnalyticsExpenseCategory | null;
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const quarter = searchParams.get("quarter");
  const date_from = searchParams.get("date_from");
  const date_to = searchParams.get("date_to");

  const out: ReportQueryParams = {};
  if (REPORT_PERIODS.includes(period as ReportPeriod)) out.period = period as ReportPeriod;
  if (year) out.year = Number(year);
  if (month) out.month = Number(month);
  if (quarter) out.quarter = Number(quarter);
  if (date_from) out.date_from = date_from;
  if (date_to) out.date_to = date_to;
  if (REPORT_GRANULARITIES.includes(granularity as ReportGranularity)) out.granularity = granularity as ReportGranularity;
  if (REPORT_CURRENCIES.includes(currency as ReportCurrency)) out.currency = currency as ReportCurrency;
  if (category) out.category = category;

  // Apply defaults for period if missing complementary fields
  const now = new Date();
  if (out.period === "month" && (out.year === undefined || out.month === undefined)) {
    out.year = now.getUTCFullYear();
    out.month = now.getUTCMonth() + 1;
  } else if (out.period === "quarter" && (out.year === undefined || out.quarter === undefined)) {
    out.year = now.getUTCFullYear();
    out.quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  } else if (out.period === "year" && out.year === undefined) {
    out.year = now.getUTCFullYear();
  } else if (out.period === "custom" && (!out.date_from || !out.date_to)) {
    // Fallback to month if custom not fully configured — keeps query valid per backend refine rules
    // Do not auto-fill date_from/to; let validation surface instead.
  }
  return out;
}

export function reportParamsToSearchEntries(params: ReportQueryParams): Record<string, string | null> {
  const entries: Record<string, string | null> = {};
  entries.period = params.period ?? null;
  entries.year = params.year !== undefined ? String(params.year) : null;
  entries.month = params.month !== undefined ? String(params.month) : null;
  entries.quarter = params.quarter !== undefined ? String(params.quarter) : null;
  entries.date_from = params.date_from ?? null;
  entries.date_to = params.date_to ?? null;
  entries.granularity = params.granularity ?? null;
  entries.currency = params.currency ?? null;
  entries.category = params.category ?? null;
  // strip nulls by caller or useUpdateSearchParams handling
  return entries;
}

export function isReportParamsValid(params: ReportQueryParams): { valid: boolean; error?: string } {
  const p = params.period ?? "month";
  if (p === "month") {
    if (params.year === undefined || params.month === undefined) return { valid: false, error: "Year and month are required." };
    if (params.month < 1 || params.month > 12) return { valid: false, error: "Month must be 1–12." };
  } else if (p === "quarter") {
    if (params.year === undefined || params.quarter === undefined) return { valid: false, error: "Year and quarter are required." };
    if (params.quarter < 1 || params.quarter > 4) return { valid: false, error: "Quarter must be 1–4." };
  } else if (p === "year") {
    if (params.year === undefined) return { valid: false, error: "Year is required." };
  } else if (p === "custom") {
    if (!params.date_from || !params.date_to) return { valid: false, error: "Start and end dates are required for custom period." };
    const from = new Date(params.date_from);
    const to = new Date(params.date_to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return { valid: false, error: "Invalid date format." };
    if (from.getTime() >= to.getTime()) return { valid: false, error: "Start date must be before end date." };
    const days = (to.getTime() - from.getTime()) / (24 * 3600 * 1000);
    if (days > 366) return { valid: false, error: "Custom range must not exceed 366 days." };
  }
  return { valid: true };
}

export function describeWindow(params: ReportQueryParams): string {
  if (params.period === "month" && params.year && params.month) return `${params.year}-${String(params.month).padStart(2, "0")}`;
  if (params.period === "quarter" && params.year && params.quarter) return `${params.year} Q${params.quarter}`;
  if (params.period === "year" && params.year) return String(params.year);
  if (params.period === "custom" && params.date_from && params.date_to) return `${params.date_from} → ${params.date_to}`;
  return "";
}
