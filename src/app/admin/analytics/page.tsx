"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ForbiddenCard } from "@/components/guards";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import { getAnalyticsOverview } from "@/features/admin/analytics-api";
import { useSession } from "@/features/auth/session-context";

const chartConfig = {
  productRevenue: { label: "Product revenue", color: "var(--chart-1)" },
  collectedTotal: { label: "Collected total", color: "var(--chart-2)" },
  costs: { label: "Costs (opex)", color: "var(--chart-5)" },
} satisfies ChartConfig;

const PRESETS = [
  { value: "7d", label: "7d", days: 7 },
  { value: "30d", label: "30d", days: 30 },
  { value: "90d", label: "90d", days: 90 },
] as const;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  return isoDay(new Date(Date.now() - (days - 1) * 24 * 3600 * 1000));
}

function parsePreset(value: string | null): string | null {
  return PRESETS.some((p) => p.value === value) ? value : null;
}

export default function AnalyticsOverviewPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();

  if (superAdminProbePending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!isSuperAdmin) {
    return (
      <ForbiddenCard message="Analytics is only available to the platform super admin." />
    );
  }

  return <AnalyticsDashboard />;
}

function AnalyticsDashboard() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const preset = parsePreset(searchParams.get("preset"));
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";

  // Server defaults to the last 30 days when no bounds are given.
  const params: Record<string, string | undefined> = {};
  if (preset === "7d") params.date_from = daysAgo(7);
  else if (preset === "90d") params.date_from = daysAgo(90);
  else if (preset === undefined && customFrom === "" && customTo === "") {
    params.date_from = daysAgo(30);
  } else if (customFrom !== "") params.date_from = customFrom;
  if (customTo !== "") params.date_to = `${customTo}T23:59:59.999Z`;

  const query = useQuery({
    queryKey: ["admin-analytics-overview", params],
    queryFn: () => getAnalyticsOverview(params),
    placeholderData: (previous) => previous,
  });

  function applyPreset(value: string) {
    const match = PRESETS.find((p) => p.value === value);
    if (!match) return;
    updateParams({ preset: value, from: null, to: null });
  }

  const stats = query.data;
  const isLoading = query.isPending;
  const hasSeriesData =
    stats !== undefined && stats.series.some((p) => p.collected_total !== "0");
  const chartData =
    stats?.series.map((point) => ({
      ...point,
      productRevenue: Number(point.product_revenue),
      collectedTotal: Number(point.collected_total),
      costs: Number(point.costs),
      label: new Date(point.bucket_start).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform-wide financial and sales performance.
          </p>
        </div>
        <Tabs
          value={preset ?? "custom"}
          onValueChange={(value) =>
            value === "custom"
              ? updateParams({
                  preset: null,
                  from: daysAgo(30),
                  to: isoDay(new Date()),
                })
              : applyPreset(value)
          }
        >
          <TabsList>
            {PRESETS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value}>
                {label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {preset === null ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="analytics-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="analytics-from"
              type="date"
              value={customFrom}
              onChange={(e) => updateParams({ from: e.target.value || null })}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="analytics-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="analytics-to"
              type="date"
              value={customTo}
              onChange={(e) => updateParams({ to: e.target.value || null })}
              className="w-40"
            />
          </div>
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Product revenue"
          sublabel={
            stats ? `collected ${stats.revenue.collected_total}` : undefined
          }
          isLoading={isLoading}
          content={
            stats ? (
              <Money value={stats.revenue.product_revenue} className="text-2xl lg:text-3xl" />
            ) : null
          }
        />
        <KpiCard
          label="Collected total"
          sublabel={
            stats
              ? `incl. shipping ${stats.revenue.shipping_collected} · tax ${stats.revenue.tax_collected}`
              : undefined
          }
          isLoading={isLoading}
          content={
            stats ? (
              <Money value={stats.revenue.collected_total} className="text-2xl lg:text-3xl" />
            ) : null
          }
        />
        <KpiCard
          label="Total costs"
          sublabel={
            stats
              ? `COGS ${stats.costs.cogs} + opex ${stats.costs.operating_expenses}`
              : undefined
          }
          isLoading={isLoading}
          content={
            stats ? (
              <Money value={stats.costs.total_costs} className="text-2xl lg:text-3xl" />
            ) : null
          }
        />
        <KpiCard
          label="Net profit"
          sublabel={
            stats
              ? `margin ${stats.profit.net_margin_pct}% · gross ${stats.profit.gross_profit}`
              : undefined
          }
          isLoading={isLoading}
          content={
            stats ? (
              <span
                className={cn(
                  "text-2xl font-semibold tabular-nums lg:text-3xl",
                  Number(stats.profit.net_profit) < 0 &&
                    "text-destructive",
                )}
              >
                {stats.profit.net_profit}
              </span>
            ) : null
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial trend</CardTitle>
          <CardDescription>
            Daily revenue vs operating expenses
            {stats ? ` · ${formatDateTime(stats.range.from)} → ${formatDateTime(stats.range.to)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : hasSeriesData ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="productRevenue"
                  type="monotone"
                  stroke="var(--color-productRevenue)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="collectedTotal"
                  type="monotone"
                  stroke="var(--color-collectedTotal)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="costs"
                  type="monotone"
                  stroke="var(--color-costs)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 3"
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              No financial activity recorded in this period yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales performance</CardTitle>
            <CardDescription>Products driving the business</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !stats ? (
              <Skeleton className="h-64 w-full" />
            ) : stats.top_products.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.top_products.map((product) => (
                    <TableRow key={product.product_public_id}>
                      <TableCell className="max-w-52 truncate">
                        <Link
                          href={`/admin/products/${product.product_public_id}`}
                          className="font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.units}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={product.revenue} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {product.gross_margin_pct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No sales recorded in this period yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <MetricTile
                label="New"
                value={stats ? String(stats.customers.new_in_range) : null}
                isLoading={isLoading}
              />
              <MetricTile
                label="Active total"
                value={stats ? String(stats.customers.total_active) : null}
                isLoading={isLoading}
              />
              <MetricTile
                label="Repeat rate"
                value={
                  stats ? `${stats.customers.repeat_purchase_pct}%` : null
                }
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales quality</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <MetricTile
                label="Orders"
                value={stats ? String(stats.orders.count) : null}
                isLoading={isLoading}
              />
              <MetricTile
                label="AOV"
                value={stats ? stats.orders.avg_order_value : null}
                isLoading={isLoading}
              />
              <MetricTile
                label="Discounted"
                value={
                  stats ? `${stats.sales_quality.discounted_orders_pct}%` : null
                }
                isLoading={isLoading}
              />
              <MetricTile
                label="Coupons used"
                value={
                  stats ? String(stats.sales_quality.coupons_redeemed) : null
                }
                isLoading={isLoading}
                className="col-span-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category share</CardTitle>
              <CardDescription>Share of product revenue</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {isLoading || !stats ? (
                <Skeleton className="h-24 w-full" />
              ) : stats.category_share.length > 0 ? (
                stats.category_share.slice(0, 6).map((category) => (
                  <div key={category.category_public_id} className="text-sm">
                    <div className="flex justify-between">
                      <span>{category.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {category.share_pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary/70"
                        style={{ width: `${Math.min(100, Number(category.share_pct))}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No categorized sales in this period.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  sublabel,
  content,
  isLoading,
}: {
  label: string;
  sublabel?: string;
  content: React.ReactNode | null;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {isLoading || content === null ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          content
        )}
        {sublabel ? (
          <span className="truncate text-xs text-muted-foreground">{sublabel}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  isLoading,
  className,
}: {
  label: string;
  value: string | null;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-3", className)}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      {isLoading || value === null ? (
        <Skeleton className="mt-1 h-6 w-14" />
      ) : (
        <p className="mt-1 font-semibold tabular-nums">{value}</p>
      )}
    </div>
  );
}
