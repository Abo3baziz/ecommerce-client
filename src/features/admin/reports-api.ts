import { apiRequest } from "@/lib/api/client";
import { http } from "@/lib/api/axios-instance";
import type {
  ExpensesReport,
  PnlReport,
  ReportQueryParams,
  RevenueReport,
} from "@/types";

function cleanParams(params: ReportQueryParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v as string | number;
  }
  return out;
}

export async function getPnlReport(params: ReportQueryParams): Promise<PnlReport> {
  const cleaned = { ...cleanParams(params), format: "json" as const };
  return apiRequest<PnlReport>({
    url: "/admin/reports/pnl",
    params: cleaned,
  });
}

export async function getRevenueReport(params: ReportQueryParams): Promise<RevenueReport> {
  const cleaned = { ...cleanParams(params), format: "json" as const };
  return apiRequest<RevenueReport>({
    url: "/admin/reports/revenue",
    params: cleaned,
  });
}

export async function getExpensesReport(params: ReportQueryParams): Promise<ExpensesReport> {
  const cleaned = { ...cleanParams(params), format: "json" as const };
  return apiRequest<ExpensesReport>({
    url: "/admin/reports/expenses",
    params: cleaned,
  });
}

export interface PdfDownloadResult {
  blob: Blob;
  filename: string;
}

function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

export async function downloadReportPdf(
  kind: "pnl" | "revenue" | "expenses",
  params: ReportQueryParams,
): Promise<PdfDownloadResult> {
  const map: Record<string, string> = {
    pnl: "/admin/reports/pnl",
    revenue: "/admin/reports/revenue",
    expenses: "/admin/reports/expenses",
  };
  // Force pdf: omit format or set pdf, let backend default to pdf
  const { format: _format, ...rest } = params;
  void _format;
  const cleaned = cleanParams(rest);
  const res = await http.get<Blob>(map[kind] as string, {
    params: cleaned,
    responseType: "blob",
  });
  const disposition = (res.headers as Record<string, string>)["content-disposition"] as string | undefined;
  const fallback = `${kind}.pdf`;
  const filename = filenameFromDisposition(disposition, fallback);
  const blob = res.data instanceof Blob ? res.data : new Blob([res.data as unknown as BlobPart], { type: "application/pdf" });
  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openBlobInline(blob: Blob): string {
  return URL.createObjectURL(blob);
}
