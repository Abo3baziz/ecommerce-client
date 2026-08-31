"use client";

import { useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import type { AnalyticsExpenseCategory } from "@/types/admin-analytics";
import { ANALYTICS_EXPENSE_CATEGORIES } from "@/types/admin-analytics";
import { isReportParamsValid, parseReportParams } from "./report-params";

interface ReportFiltersProps {
  showCategory?: boolean;
  onDownload?: () => void;
  onPreviewInline?: () => void;
  downloadLoading?: boolean;
}

export function ReportFilters({ showCategory = false, onDownload, onPreviewInline, downloadLoading }: ReportFiltersProps) {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const params = parseReportParams(searchParams);
  const validation = isReportParamsValid(params);

  const period = params.period ?? "month";

  function setPeriod(next: string) {
    const p = next as typeof period;
    if (p === "month") {
      const now = new Date();
      updateParams({ period: "month", year: String(now.getUTCFullYear()), month: String(now.getUTCMonth() + 1), quarter: null, date_from: null, date_to: null });
    } else if (p === "quarter") {
      const now = new Date();
      updateParams({ period: "quarter", year: String(now.getUTCFullYear()), quarter: String(Math.floor(now.getUTCMonth() / 3) + 1), month: null, date_from: null, date_to: null });
    } else if (p === "year") {
      const now = new Date();
      updateParams({ period: "year", year: String(now.getUTCFullYear()), month: null, quarter: null, date_from: null, date_to: null });
    } else {
      // custom — keep existing dates or default to last 30d
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      updateParams({ period: "custom", year: null, month: null, quarter: null, date_from: params.date_from ?? from, date_to: params.date_to ?? to });
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-none border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap gap-2">
          {onPreviewInline ? (
            <Button variant="outline" size="sm" onClick={onPreviewInline} disabled={!validation.valid || downloadLoading} className="rounded-none">
              Preview PDF
            </Button>
          ) : null}
          {onDownload ? (
            <Button size="sm" onClick={onDownload} disabled={!validation.valid || downloadLoading} className="rounded-none">
              {downloadLoading ? "Preparing…" : "Download PDF"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {period === "month" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-year" className="text-xs text-muted-foreground">Year</Label>
              <Input
                id="report-year"
                type="number"
                value={params.year ?? ""}
                onChange={(e) => updateParams({ year: e.target.value || null })}
                placeholder="2026"
                className="rounded-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-month" className="text-xs text-muted-foreground">Month</Label>
              <Select value={params.month ? String(params.month) : undefined} onValueChange={(v) => updateParams({ month: v })}>
                <SelectTrigger id="report-month" className="rounded-none">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{String(i + 1).padStart(2, "0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
        {period === "quarter" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-year-q" className="text-xs text-muted-foreground">Year</Label>
              <Input
                id="report-year-q"
                type="number"
                value={params.year ?? ""}
                onChange={(e) => updateParams({ year: e.target.value || null })}
                placeholder="2026"
                className="rounded-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-quarter" className="text-xs text-muted-foreground">Quarter</Label>
              <Select value={params.quarter ? String(params.quarter) : undefined} onValueChange={(v) => updateParams({ quarter: v })}>
                <SelectTrigger id="report-quarter" className="rounded-none">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
        {period === "year" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-year-y" className="text-xs text-muted-foreground">Year</Label>
            <Input
              id="report-year-y"
              type="number"
              value={params.year ?? ""}
              onChange={(e) => updateParams({ year: e.target.value || null })}
              placeholder="2026"
              className="rounded-none"
            />
          </div>
        ) : null}
        {period === "custom" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-from" className="text-xs text-muted-foreground">From</Label>
              <Input
                id="report-from"
                type="date"
                value={params.date_from ?? ""}
                onChange={(e) => updateParams({ date_from: e.target.value || null })}
                className="rounded-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-to" className="text-xs text-muted-foreground">To</Label>
              <Input
                id="report-to"
                type="date"
                value={params.date_to ?? ""}
                onChange={(e) => updateParams({ date_to: e.target.value || null })}
                className="rounded-none"
              />
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-granularity" className="text-xs text-muted-foreground">Granularity</Label>
          <Select value={params.granularity ?? "auto"} onValueChange={(v) => updateParams({ granularity: v })}>
            <SelectTrigger id="report-granularity" className="rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-currency" className="text-xs text-muted-foreground">Currency</Label>
          <Select value={params.currency ?? "USD"} onValueChange={(v) => updateParams({ currency: v })}>
            <SelectTrigger id="report-currency" className="rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="EGP">EGP</SelectItem>
              <SelectItem value="SAR">SAR</SelectItem>
              <SelectItem value="AED">AED</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showCategory ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-category" className="text-xs text-muted-foreground">Category</Label>
            <Select
              value={params.category ?? "all"}
              onValueChange={(v) => updateParams({ category: v === "all" ? null : v })}
            >
              <SelectTrigger id="report-category" className="rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {ANALYTICS_EXPENSE_CATEGORIES.map((c: AnalyticsExpenseCategory) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      {!validation.valid ? <p className="text-sm text-destructive">{validation.error}</p> : null}
      <p className="text-xs text-muted-foreground">Period: <span className="font-mono">{period}</span> · Bucket auto-resolves: ≤31d → day, else month. Use Download for signed PDF; JSON preview loads below.</p>
    </div>
  );
}
