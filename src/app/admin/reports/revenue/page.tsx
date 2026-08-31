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
import { getRevenueReport, downloadReportPdf, downloadBlob, openBlobInline } from "@/features/admin/reports-api";
import { ReportFilters } from "@/features/admin/report-components/report-filters";
import { isReportParamsValid, parseReportParams } from "@/features/admin/report-components/report-params";
import { useSession } from "@/features/auth/session-context";
import { toast } from "sonner";

const chartConfig = {
  collectedTotal: { label: "Collected total", color: "var(--chart-2)" },
  productRevenue: { label: "Product revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function RevenueReportPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();
  if (superAdminProbePending) return <div className="flex flex-col gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-96 w-full" /></div>;
  if (!isSuperAdmin) return <ForbiddenCard message="Reports are only available to the platform super admin." />;
  return <RevenueDashboard />;
}

function RevenueDashboard() {
  const searchParams = useSearchParams();
  const params = parseReportParams(searchParams);
  const validation = isReportParamsValid(params);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const query = useQuery({
    queryKey: ["admin-report-revenue", params],
    queryFn: () => getRevenueReport(params),
    enabled: validation.valid,
    placeholderData: (prev) => prev,
  });

  async function handleDownload() {
    setDownloading(true);
    try { const { blob, filename } = await downloadReportPdf("revenue", params); downloadBlob(blob, filename); toast.success(`Downloaded ${filename}`); } catch (e) { toast.error(e instanceof Error ? e.message : "Download failed"); } finally { setDownloading(false); }
  }
  async function handlePreview() {
    setDownloading(true);
    try { const { blob } = await downloadReportPdf("revenue", { ...params, disposition: "inline" }); const url = openBlobInline(blob); setPdfUrl((p) => { if (p) URL.revokeObjectURL(p); return url; }); } catch (e) { toast.error(e instanceof Error ? e.message : "Preview failed"); } finally { setDownloading(false); }
  }

  const data = query.data;
  const isLoading = query.isPending;
  const chartData = data?.series.map((p) => ({
    ...p,
    productRevenue: Number(p.product_revenue),
    collectedTotal: Number(p.collected_total),
    label: new Date(p.bucket_start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
  })) ?? [];
  const hasSeries = data ? data.series.some((p) => p.product_revenue !== "0" || p.collected_total !== "0") : false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">Collected vs product revenue, discounts & refunds {data ? `· ${data.window.label} · ${formatDateTime(data.range.from)} → ${formatDateTime(data.range.to)}` : ""}</p>
      </div>

      <ReportFilters onDownload={handleDownload} onPreviewInline={handlePreview} downloadLoading={downloading} />

      {!validation.valid ? <p className="text-sm text-destructive">{validation.error}</p> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {pdfUrl ? <Card className="rounded-none"><CardHeader><CardTitle className="text-sm">PDF preview</CardTitle></CardHeader><CardContent><iframe src={pdfUrl} title="Revenue PDF preview" className="h-[720px] w-full border" /></CardContent></Card> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Product revenue" isLoading={isLoading} content={data ? <Money value={data.revenue.product_revenue} className="text-2xl lg:text-3xl" /> : null} sublabel={data ? `discounts ${data.revenue.discounts_given}` : undefined} />
        <KpiCard label="Collected total" isLoading={isLoading} content={data ? <Money value={data.revenue.collected_total} className="text-2xl lg:text-3xl" /> : null} sublabel={data ? `refunded ${data.revenue.refunded_total} separate` : undefined} />
        <KpiCard label="Orders" isLoading={isLoading} content={data ? <span className="text-2xl font-semibold tabular-nums lg:text-3xl">{data.orders.count}</span> : null} sublabel={data ? `AOV ${data.orders.avg_order_value}` : undefined} />
        <KpiCard label="Window" isLoading={isLoading} content={data ? <span className="text-lg font-semibold">{data.window.label}</span> : null} sublabel={data ? `bucket ${data.window.bucket}` : undefined} />
      </div>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Revenue summary</CardTitle></CardHeader>
        <CardContent>
          {isLoading || !data ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <div><p className="text-xs text-muted-foreground">Product revenue</p><Money value={data.revenue.product_revenue} /></div>
              <div><p className="text-xs text-muted-foreground">Collected total</p><Money value={data.revenue.collected_total} /></div>
              <div><p className="text-xs text-muted-foreground">Discounts</p><Money value={data.revenue.discounts_given} /></div>
              <div><p className="text-xs text-muted-foreground">Refunded</p><Money value={data.revenue.refunded_total} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Trend ({data?.window.bucket ?? "auto"})</CardTitle><CardDescription>Collected total vs product revenue</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-72 w-full" /> : hasSeries ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={64} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="productRevenue" type="monotone" stroke="var(--color-productRevenue)" strokeWidth={2} dot={false} />
                <Line dataKey="collectedTotal" type="monotone" stroke="var(--color-collectedTotal)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">No series data for this period.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader><CardTitle>Top products</CardTitle></CardHeader>
          <CardContent>
            {isLoading || !data ? <Skeleton className="h-64 w-full" /> : data.top_products.length ? (
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Units</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Margin</TableHead></TableRow></TableHeader>
                <TableBody>{data.top_products.map((p) => (
                  <TableRow key={p.product_public_id}><TableCell className="max-w-44 truncate"><Link href={`/admin/products/${p.product_public_id}`} className="hover:underline font-medium">{p.name}</Link></TableCell><TableCell className="text-right tabular-nums">{p.units}</TableCell><TableCell className="text-right"><Money value={p.revenue} /></TableCell><TableCell className="text-right tabular-nums text-muted-foreground">{p.gross_margin_pct}%</TableCell></TableRow>
                ))}</TableBody></Table>
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
    </div>
  );
}

function KpiCard({ label, sublabel, content, isLoading }: { label: string; sublabel?: string; content: React.ReactNode | null; isLoading: boolean }) {
  return <Card className="rounded-none"><CardContent className="flex flex-col gap-1 pt-6"><span className="text-sm font-medium text-muted-foreground">{label}</span>{isLoading || content === null ? <Skeleton className="h-9 w-24" /> : content}{sublabel ? <span className="truncate text-xs text-muted-foreground">{sublabel}</span> : null}</CardContent></Card>;
}
