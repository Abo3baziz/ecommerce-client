"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  FolderTree,
  MessageSquareText,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import { RevenueTrendChart } from "@/features/admin/dashboard-components/revenue-trend-chart";
import {
  useAdminCatalogCounts,
  useAdminStats,
  useRecentAdminOrders,
} from "@/features/admin/dashboard-api";
import type { StatsPeriodPreset } from "@/types";
import { STATS_PERIOD_PRESETS } from "@/types";

const PERIOD_LABELS: Record<StatsPeriodPreset, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "REFUNDED",
  "CANCELLED",
] as const;


interface CatalogCounts {
  products: number | null;
  categories: number | null;
}

function parsePreset(value: string | null): StatsPeriodPreset {
  return STATS_PERIOD_PRESETS.includes(value as StatsPeriodPreset)
    ? (value as StatsPeriodPreset)
    : "7d";
}

function utcDayBound(value: string, endOfDay: boolean): string {
  const date = new Date(value);
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return endOfDay ? `${y}-${m}-${d}T23:59:59.999Z` : `${y}-${m}-${d}`;
}

function KpiCard({
  label,
  sublabel,
  value,
  isLoading,
}: {
  label: string;
  sublabel?: string;
  value: ReactNode | null;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {isLoading || value === null ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          value
        )}
        {sublabel ? (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OrdersStatusBar({
  status,
  count,
  max,
  fromIso,
  toIso,
}: {
  status: string;
  count: number;
  max: number;
  fromIso: string;
  toIso: string;
}) {
  return (
    <Link
      href={`/admin/orders?status=${status}&placed_from=${utcDayBound(
        fromIso,
        false,
      )}&placed_to=${utcDayBound(toIso, true)}`}
      className="group flex items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-muted"
    >
      <StatusBadge value={status} className="w-28 justify-center" />
      <span className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
        <span
          className={cn(
            "block h-full rounded-sm bg-primary/70 transition-all group-hover:bg-primary",
            count === 0 && "bg-muted-foreground/20 group-hover:bg-muted-foreground/30",
          )}
          style={{ width: `${Math.round((count / max) * 100)}%` }}
        />
      </span>
      <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
        {count}
      </span>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const preset = parsePreset(searchParams.get("period"));
  const { stats, isLoading, isError, refetch } = useAdminStats(preset);
  const recent = useRecentAdminOrders(8);
  const catalogCounts = useAdminCatalogCounts();

  function handlePeriodChange(value: string) {
    updateParams({ period: value === "7d" ? null : value });
  }

  const inPeriodOrderCount = stats
    ? Object.values(stats.orders_by_status).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Store performance across every section.
          </p>
        </div>
        <Tabs value={preset} onValueChange={handlePeriodChange}>
          <TabsList>
            {STATS_PERIOD_PRESETS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {PERIOD_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isError ? (
        <ErrorState
          error={{ status: 0, message: "Could not load the store statistics." }}
          onRetry={() => refetch()}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Gross revenue"
          sublabel={PERIOD_LABELS[preset]}
          isLoading={isLoading}
          value={
            stats ? (
              <Money value={stats.revenue.gross_total} className="text-3xl" />
            ) : null
          }
        />
        <KpiCard
          label="Net revenue"
          sublabel={
            stats && Number(stats.revenue.refunded_total) > 0
              ? `${stats.revenue.refunded_total} refunded`
              : undefined
          }
          isLoading={isLoading}
          value={
            stats ? (
              <Money value={stats.revenue.net_total} className="text-3xl" />
            ) : null
          }
        />
        <KpiCard
          label="Avg order value"
          sublabel={`${stats?.revenue.order_count ?? 0} orders`}
          isLoading={isLoading}
          value={
            stats ? (
              <Money
                value={stats.revenue.avg_order_value}
                className="text-3xl"
              />
            ) : null
          }
        />
        <KpiCard
          label="New customers"
          sublabel={
            stats ? `${stats.customers.total_active} active total` : undefined
          }
          isLoading={isLoading}
          value={
            stats ? (
              <span className="text-3xl font-semibold tabular-nums">
                {stats.customers.new_in_period}
              </span>
            ) : null
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
          <CardDescription>Gross vs net over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : stats && stats.series.some((point) => point.gross !== "0") ? (
            <RevenueTrendChart stats={stats} />
          ) : (
            <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No revenue recorded in this period yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <CardDescription>
              {inPeriodOrderCount} placed · click a status to open the filtered
              list
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {isLoading || !stats ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              STATUS_ORDER.map((status) => (
                <OrdersStatusBar
                  key={status}
                  status={status}
                  count={stats.orders_by_status[status]}
                  max={Math.max(1, ...Object.values(stats.orders_by_status))}
                  fromIso={stats.period.from}
                  toIso={stats.period.to}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Best sellers by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !stats ? (
              <Skeleton className="h-56 w-full" />
            ) : stats.top_products.length > 0 ? (
              <ol className="flex flex-col divide-y">
                {stats.top_products.map((product, index) => (
                  <li
                    key={product.product_public_id}
                    className="py-2 first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`/admin/products/${product.product_public_id}`}
                      className="group flex items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-5 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium group-hover:underline">
                            {product.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {product.units} sold
                          </span>
                        </span>
                      </span>
                      <Money
                        value={product.revenue}
                        className="shrink-0 text-sm font-medium"
                      />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No sales in this period yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <SectionCards
        signals={
          stats
            ? {
                lowStock: stats.stock_health.low_stock_count,
                outOfStock: stats.stock_health.out_of_stock_count,
                pendingReviews: stats.reviews.pending_moderation_count,
                newCustomers: stats.customers.new_in_period,
                activeCustomers: stats.customers.total_active,
                ordersInPeriod: inPeriodOrderCount,
              }
            : null
        }
        counts={catalogCounts}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Latest activity across the store</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/orders">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.isError ? (
            <ErrorState
              error={{ status: 0, message: "Could not load recent orders." }}
              onRetry={() => refetch()}
            />
          ) : recent.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : recent.orders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No orders have been placed yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.orders.map((order) => (
                  <TableRow key={order.public_id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.public_id}`}
                        className="font-mono text-sm hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>
                      <StatusBadge value={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(order.placed_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={order.total_amount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SectionSignals {
  lowStock: number;
  outOfStock: number;
  pendingReviews: number;
  newCustomers: number;
  activeCustomers: number;
  ordersInPeriod: number;
}

function SectionCards({
  signals,
  counts,
}: {
  signals: SectionSignals | null;
  counts: CatalogCounts;
}) {
  const cards: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
    signal: React.ReactNode;
  }> = [
    {
      label: "Products",
      href: "/admin/products",
      icon: Package,
      signal:
        counts.products === null ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <SectionCount value={counts.products} />
        ),
    },
    {
      label: "Categories",
      href: "/admin/categories",
      icon: FolderTree,
      signal:
        counts.categories === null ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <SectionCount value={counts.categories} />
        ),
    },
    {
      label: "Inventory",
      href: "/admin/inventory",
      icon: Warehouse,
      signal: signals ? (
        <span className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className={cn(signals.lowStock > 0 && "font-medium text-amber-600 dark:text-amber-400")}>
            {signals.lowStock} low stock
          </span>
          ·
          <span className={cn(signals.outOfStock > 0 && "font-medium text-red-600 dark:text-red-400")}>
            {signals.outOfStock} out of stock
          </span>
        </span>
      ) : (
        <Skeleton className="h-5 w-36" />
      ),
    },
    {
      label: "Orders",
      href: "/admin/orders",
      icon: ShoppingCart,
      signal: signals ? (
        <SectionCount value={signals.ordersInPeriod} suffix="in period" />
      ) : (
        <Skeleton className="h-5 w-24" />
      ),
    },
    {
      label: "Reviews",
      href: "/admin/reviews?is_approved=false",
      icon: MessageSquareText,
      signal: signals ? (
        <SectionCount
          value={signals.pendingReviews}
          suffix="pending moderation"
          warn={signals.pendingReviews > 0}
        />
      ) : (
        <Skeleton className="h-5 w-40" />
      ),
    },
    {
      label: "Customers",
      href: "/admin/users",
      icon: Users,
      signal: signals ? (
        <SectionCount
          value={signals.activeCustomers}
          suffix={`active · ${signals.newCustomers} new`}
        />
      ) : (
        <Skeleton className="h-5 w-32" />
      ),
    },
  ];

  return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ label, href, icon: Icon, signal }) => (
        <Link key={href} href={href} className="group">
          <Card className="h-full transition-colors group-hover:border-foreground/30">
            <CardContent className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                  {label}
                </span>
                {signal}
              </div>
              <ArrowUpRight
                className="size-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground"
                aria-hidden
              />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function SectionCount({
  value,
  suffix,
  big = false,
  warn = false,
}: {
  value: number;
  suffix?: string;
  big?: boolean;
  warn?: boolean;
}) {
  return (
    <span className="min-w-0 truncate text-sm">
      <span
        className={cn(
          big
            ? "text-3xl font-semibold tabular-nums"
            : "font-semibold tabular-nums",
          warn && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value.toLocaleString()}
      </span>
      {suffix ? (
        <span className="ml-1 text-muted-foreground">{suffix}</span>
      ) : null}
    </span>
  );
}
