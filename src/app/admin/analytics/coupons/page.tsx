"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { StatusBadge } from "@/components/shared/status-badge";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import { getCouponAnalytics } from "@/features/admin/analytics-api";
import { useSession } from "@/features/auth/session-context";

const chartConfig = {
  redemptions: { label: "Redemptions", color: "var(--chart-1)" },
  discountAmount: { label: "Discount given", color: "var(--chart-5)" },
} satisfies ChartConfig;

const PRESETS = [
  { value: "7d", label: "7d", days: 7 },
  { value: "30d", label: "30d", days: 30 },
  { value: "90d", label: "90d", days: 90 },
] as const;

function parsePreset(value: string | null): string | null {
  return PRESETS.some((p) => p.value === value) ? value : null;
}

export default function CouponInsightsPage() {
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
      <ForbiddenCard message="Coupon insights are only available to the platform super admin." />
    );
  }

  return <CouponAnalyticsDashboard />;
}

function CouponAnalyticsDashboard() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const preset = parsePreset(searchParams.get("preset"));
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";

  const params: Record<string, string | undefined> = {};
  if (preset === "7d") params.date_from = daysAgo(7);
  else if (preset === "90d") params.date_from = daysAgo(90);
  else if (preset === undefined && customFrom === "" && customTo === "") {
    params.date_from = daysAgo(30);
  } else if (customFrom !== "") params.date_from = customFrom;
  if (customTo !== "") params.date_to = `${customTo}T23:59:59.999Z`;

  const query = useQuery({
    queryKey: ["admin-analytics-coupons", params],
    queryFn: () => getCouponAnalytics(params),
    placeholderData: (previous) => previous,
  });

  function handlePreset(value: string) {
    if (value === "custom") {
      updateParams({ preset: null, from: daysAgo(30), to: today() });
      return;
    }
    updateParams({ preset: value, from: null, to: null });
  }

  const stats = query.data;
  const isLoading = query.isPending;
  const hasTrendData =
    stats !== undefined && stats.trend.some((p) => p.redemptions > 0);
  const chartData =
    stats?.trend.map((point) => ({
      date: point.date.slice(5),
      redemptions: point.redemptions,
      discountAmount: Number(point.discount_amount),
    })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupon insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How discount codes perform across the platform.
          </p>
        </div>
        <Tabs value={preset ?? "custom"} onValueChange={handlePreset}>
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
            <Label htmlFor="coupons-from" className="text-xs text-muted-foreground">From</Label>
            <Input
              id="coupons-from"
              type="date"
              value={customFrom}
              onChange={(e) => updateParams({ from: e.target.value || null })}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupons-to" className="text-xs text-muted-foreground">To</Label>
            <Input
              id="coupons-to"
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Total coupons" value={stats?.totals.total_coupons} isLoading={isLoading} />
        <MetricTile label="Active" value={stats?.totals.active_coupons} isLoading={isLoading} />
        <MetricTile
          label="Inactive / expired"
          value={
            stats ? `${stats.totals.inactive_coupons} / ${stats.totals.expired_coupons}` : null
          }
          isLoading={isLoading}
        />
        <MetricTile
          label="Limit reached"
          value={stats?.totals.usage_limit_reached}
          isLoading={isLoading}
        />
        <MetricTile
          label="Redemptions in range"
          value={stats?.totals.range_redemptions}
          sublabel={`${stats?.totals.lifetime_redemptions ?? 0} lifetime`}
          isLoading={isLoading}
        />
        <MetricTile
          label="Discounts given"
          value={stats ? stats.totals.discounts_given_in_range : null}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage trend</CardTitle>
          <CardDescription>Daily redemptions and discount amount given</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : hasTrendData ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <ComposedChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis yAxisId="count" tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <YAxis yAxisId="amount" orientation="right" tickLine={false} axisLine={false} width={48} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  yAxisId="count"
                  dataKey="redemptions"
                  fill="var(--color-redemptions)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="amount"
                  dataKey="discountAmount"
                  type="monotone"
                  stroke="var(--color-discountAmount)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          ) : (
            <p className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              No coupon redemptions recorded in this period yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue via coupon orders</CardTitle>
          <CardDescription>
            Collected totals from orders that redeemed a code
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricTile
            label="Revenue"
            value={stats ? stats.totals.coupon_orders_revenue : null}
            isLoading={isLoading}
          />
          <MetricTile
            label="Coupon orders"
            value={stats ? String(stats.totals.coupon_orders_count) : null}
            isLoading={isLoading}
          />
          <MetricTile
            label="Share of orders"
            value={stats ? `${stats.totals.coupon_orders_share_pct}%` : null}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most used coupons</CardTitle>
          <CardDescription>Lifetime redemptions with in-range activity</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !stats ? (
            <Skeleton className="h-56 w-full" />
          ) : stats.most_used.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type / value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lifetime uses</TableHead>
                  <TableHead className="text-right">In range</TableHead>
                  <TableHead className="text-right">Discounts given</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.most_used.map((coupon) => (
                  <TableRow key={coupon.coupon_public_id}>
                    <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                    <TableCell>
                      {coupon.discount_type === "PERCENTAGE"
                        ? `${Number(coupon.discount_value)}%`
                        : <Money value={coupon.discount_value} />}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={coupon.is_active ? "ACTIVE" : "INACTIVE"} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{coupon.lifetime_uses}</TableCell>
                    <TableCell className="text-right tabular-nums">{coupon.range_redemptions}</TableCell>
                    <TableCell className="text-right">
                      <Money value={coupon.discounts_given_in_range} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No coupons have been created yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sublabel,
  isLoading,
}: {
  label: string;
  value: string | number | null | undefined;
  sublabel?: string;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      {isLoading || value === null ? (
        <Skeleton className="mt-1 h-6 w-16" />
      ) : (
        <p className="mt-1 truncate font-semibold tabular-nums">{value}</p>
      )}
      {sublabel ? (
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}

function daysAgo(days: number): string {
  return new Date(Date.now() - (days - 1) * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
