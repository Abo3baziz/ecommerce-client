"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPnlReport, downloadReportPdf, downloadBlob, openBlobInline } from "@/features/admin/reports-api";
import { ReportFilters } from "@/features/admin/report-components/report-filters";
import { isReportParamsValid, parseReportParams } from "@/features/admin/report-components/report-params";
import { useSession } from "@/features/auth/session-context";
import { toast } from "sonner";

const chartConfig = {
  productRevenue: { label: "Product revenue", color: "var(--chart-1)" },
  costs: { label: "Costs", color: "var(--chart-5)" },
} satisfies ChartConfig;

export default function PnlReportPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="Reports are only available to the platform super admin." />;
  return <PnlDashboard />;
}

function PnlDashboard() {
  const searchParams = useSearchParams();
  const params = parseReportParams(searchParams);
  const validation = isReportParamsValid(params);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const query = useQuery({
    queryKey: ["admin-report-pnl", params],
    queryFn: () => getPnlReport(params),
    enabled: validation.valid,
    placeholderData: (prev) => prev,
  });

  async function handleDownload() {
    setDownloading(true);
    try {
      const { blob, filename } = await downloadReportPdf("pnl", params);
      downloadBlob(blob, filename);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally { setDownloading(false); }
  }
  async function handlePreview() {
    setDownloading(true);
    try {
      const { blob } = await downloadReportPdf("pnl", { ...params, disposition: "inline" });
      const url = openBlobInline(blob);
      setPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally { setDownloading(false); }
  }

  const data = query.data;
  const isLoading = query.isPending;

  const chartData = data?.series.map((p) => ({
    ...p,
    productRevenue: Number(p.product_revenue),
    costs: Number(p.costs),
    label: new Date(p.bucket_start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  })) ?? [];

  const hasSeries = data ? data.series.some((p) => p.product_revenue !== "0" || p.costs !== "0") : false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">P&L Statement</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profit & loss across revenue, COGS, operating expenses and derived margins {data ? `· ${data.window.label} · ${formatDateTime(data.range.from)} → ${formatDateTime(data.range.to)}` : ""}</p>
      </div>

      <ReportFilters onDownload={handleDownload} onPreviewInline={handlePreview} downloadLoading={downloading} />

      {!validation.valid ? <p className="text-sm text-destructive">{validation.error} — adjust filters above to load preview.</p> : null}

      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

      {pdfUrl ? (
        <Card className="rounded-none">
          <CardHeader><CardTitle className="text-sm">PDF preview (inline)</CardTitle></CardHeader>
          <CardContent><iframe src={pdfUrl} title="P&L PDF preview" className="h-[720px] w-full border" /></CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Product revenue" isLoading={isLoading} content={data ? <Money value={data.revenue.product_revenue} className="text-2xl lg:text-3xl" /> : null} sublabel={data ? `collected ${data.revenue.collected_total}` : undefined} />
        <KpiCard label="Total costs" isLoading={isLoading} content={data ? <Money value={data.costs.total_costs} className="text-2xl lg:text-3xl" /> : null} sublabel={data ? `COGS ${data.costs.cogs} + opex ${data.costs.operating_expenses}` : undefined} />
        <KpiCard label="Net profit" isLoading={isLoading} content={data ? <span className={cn("text-2xl font-semibold tabular-nums lg:text-3xl", Number(data.profit.net_profit) < 0 && "text-destructive")}>{data.profit.net_profit}</span> : null} sublabel={data ? `margin ${data.profit.net_margin_pct}% · gross ${data.profit.gross_profit}` : undefined} />
        <KpiCard label="Orders" isLoading={isLoading} content={data ? <span className="text-2xl font-semibold tabular-nums lg:text-3xl">{data.orders.count}</span> : null} sublabel={data ? `AOV ${data.orders.avg_order_value}` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader><CardTitle className="text-sm">Revenue</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {isLoading || !data ? <Skeleton className="h-40 w-full" /> : (
              <div className="grid grid-cols-2 gap-2">
                <Kv label="Product revenue" value={<Money value={data.revenue.product_revenue} />} />
                <Kv label="Collected total" value={<Money value={data.revenue.collected_total} />} />
                <Kv label="Shipping" value={<Money value={data.revenue.shipping_collected} />} />
                <Kv label="Tax" value={<Money value={data.revenue.tax_collected} />} />
                <Kv label="Discounts" value={<Money value={data.revenue.discounts_given} />} />
                <Kv label="Refunded" value={<Money value={data.revenue.refunded_total} />} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader><CardTitle className="text-sm">Costs</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {isLoading || !data ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Kv label="COGS" value={<Money value={data.costs.cogs} />} />
                  <Kv label="Opex" value={<Money value={data.costs.operating_expenses} />} />
                  <Kv label="Total" value={<Money value={data.costs.total_costs} />} />
                </div>
                {data.costs.byCategory.length ? (
                  <div className="space-y-1.5">
                    {data.costs.byCategory.map((r) => (
                      <div key={r.category} className="flex justify-between text-xs"><span>{r.category}</span><Money value={r.total} /></div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No opex in period.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Trend ({data?.window.bucket ?? "auto"})</CardTitle><CardDescription>Product revenue vs costs {data ? `· ${data.series.length} buckets` : ""}</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-72 w-full" /> : hasSeries ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={64} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="productRevenue" type="monotone" stroke="var(--color-productRevenue)" strokeWidth={2} dot={false} />
                <Line dataKey="costs" type="monotone" stroke="var(--color-costs)" strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ChartContainer>
          ) : <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">No series data for this period.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader><CardTitle>Top products</CardTitle><CardDescription>By revenue</CardDescription></CardHeader>
          <CardContent>
            {isLoading || !data ? <Skeleton className="h-64 w-full" /> : data.top_products.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Units</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Margin</TableHead></TableRow></TableHeader>
                <TableBody>{data.top_products.map((p) => (
                  <TableRow key={p.product_public_id}><TableCell className="max-w-44 truncate"><Link href={`/admin/products/${p.product_public_id}`} className="hover:underline font-medium">{p.name}</Link></TableCell><TableCell className="text-right tabular-nums">{p.units}</TableCell><TableCell className="text-right"><Money value={p.revenue} /></TableCell><TableCell className="text-right tabular-nums text-muted-foreground">{p.gross_margin_pct}%</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            ) : <p className="py-10 text-center text-sm text-muted-foreground">No sales in period.</p>}
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardHeader><CardTitle>Category share</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {isLoading || !data ? <Skeleton className="h-24 w-full" /> : data.category_share.length ? data.category_share.slice(0, 6).map((c) => (
              <div key={c.category_public_id} className="text-sm"><div className="flex justify-between"><span>{c.name}</span><span className="tabular-nums text-muted-foreground">{c.share_pct}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-primary/70" style={{ width: `${Math.min(100, Number(c.share_pct))}%` }} /></div></div>
            )) : <p className="py-6 text-center text-sm text-muted-foreground">No categorized sales.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-none"><CardHeader><CardTitle className="text-sm">Customers</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-2 text-center">
          <Metric label="New" value={data ? String(data.customers.new_in_range) : null} loading={isLoading} />
          <Metric label="Active" value={data ? String(data.customers.total_active) : null} loading={isLoading} />
          <Metric label="Repeat" value={data ? `${data.customers.repeat_purchase_pct}%` : null} loading={isLoading} />
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle className="text-sm">Sales quality</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Discounted" value={data ? `${data.sales_quality.discounted_orders_pct}%` : null} loading={isLoading} />
          <Metric label="Coupons" value={data ? String(data.sales_quality.coupons_redeemed) : null} loading={isLoading} />
          <Metric label="Gross margin" value={data && data.top_products[0] ? `${data.top_products[0].gross_margin_pct}%` : data ? "—" : null} loading={isLoading} />
        </CardContent></Card>
        <Card className="rounded-none"><CardHeader><CardTitle className="text-sm">Meta</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Window label: {data?.window.label ?? "—"}</p>
          <p>Bucket: {data?.window.bucket ?? "—"}</p>
          <p>COGS uses current variant cost_price (snapshot pending).</p>
        </CardContent></Card>
      </div>
    </div>
  );
}

function KpiCard({ label, sublabel, content, isLoading }: { label: string; sublabel?: string; content: React.ReactNode | null; isLoading: boolean }) {
  return <Card className="rounded-none"><CardContent className="flex flex-col gap-1 pt-6"><span className="text-sm font-medium text-muted-foreground">{label}</span>{isLoading || content === null ? <Skeleton className="h-9 w-24" /> : content}{sublabel ? <span className="truncate text-xs text-muted-foreground">{sublabel}</span> : null}</CardContent></Card>;
}
function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium tabular-nums">{value}</p></div>;
}
function Metric({ label, value, loading }: { label: string; value: string | null; loading: boolean }) {
  return <div className="rounded-lg border p-3"><p className="truncate text-xs text-muted-foreground">{label}</p>{loading || value === null ? <Skeleton className="mt-1 h-6 w-14" /> : <p className="mt-1 font-semibold tabular-nums">{value}</p>}</div>;
}
