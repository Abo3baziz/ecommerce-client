"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpNarrowWide,
  ReceiptText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthGate } from "@/components/guards";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  PaginationFromStandard,
} from "@/components/shared/pagination";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUSES } from "@/types/enums";
import type { OrderStatus } from "@/types/enums";
import type { Order } from "@/types/orders";
import { ORDERS_PAGE_SIZE, useOrders } from "@/features/orders/hooks";

const SORT_FIELDS = ["placed_at", "order_number", "total_amount"] as const;
type SortField = (typeof SORT_FIELDS)[number];

const SORT_LABELS: Record<SortField, string> = {
  placed_at: "Placed date",
  order_number: "Order number",
  total_amount: "Total amount",
};

interface OrdersFilterValues {
  status: OrderStatus | null;
  sort: SortField;
  desc: boolean;
  page: number;
}

function parseFilters(searchParams: URLSearchParams): OrdersFilterValues {
  const statusRaw = searchParams.get("status");
  const status = ORDER_STATUSES.find((value) => value === statusRaw) ?? null;
  const sortRaw = searchParams.get("sort");
  const sort = SORT_FIELDS.find((value) => value === sortRaw) ?? "placed_at";
  const pageRaw = Number.parseInt(searchParams.get("page") ?? "", 10);
  return {
    status,
    sort,
    desc: searchParams.get("dir") !== "asc",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

function OrdersBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const values = parseFilters(searchParams);

  function applyUpdate(updates: Partial<OrdersFilterValues>) {
    const merged: OrdersFilterValues = { ...values, ...updates };
    const next = new URLSearchParams(Array.from(searchParams.entries()));
    if (merged.status) {
      next.set("status", merged.status);
    } else {
      next.delete("status");
    }
    if (merged.sort !== "placed_at") {
      next.set("sort", merged.sort);
    } else {
      next.delete("sort");
    }
    if (!merged.desc) {
      next.set("dir", "asc");
    } else {
      next.delete("dir");
    }
    if ((updates.page ?? merged.page) > 1) {
      next.set("page", String(merged.page));
    } else {
      next.delete("page");
    }
    const query = next.toString();
    router.replace(query ? `/orders?${query}` : "/orders", { scroll: false });
  }

  const ordersQuery = useOrders({
    page: values.page,
    limit: ORDERS_PAGE_SIZE,
    status: values.status ?? undefined,
    sort: values.sort,
    desc: values.desc,
  });

  const data = ordersQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
        <p className="text-sm text-muted-foreground">
          Track and review everything you have ordered.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={values.status === null ? "default" : "outline"}
            onClick={() => applyUpdate({ status: null, page: 1 })}
            aria-pressed={values.status === null}
          >
            All
          </Button>
          {ORDER_STATUSES.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={values.status === status ? "default" : "outline"}
              onClick={() => applyUpdate({ status, page: 1 })}
              aria-pressed={values.status === status}
            >
              {status}
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Select
            value={values.sort}
            onValueChange={(next) => {
              if (SORT_FIELDS.some((field) => field === next)) {
                applyUpdate({ sort: next as SortField, page: 1 });
              }
            }}
          >
            <SelectTrigger aria-label="Sort orders by" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_FIELDS.map((field) => (
                <SelectItem key={field} value={field}>
                  {SORT_LABELS[field]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label={
              values.desc
                ? "Sorted descending — switch to ascending"
                : "Sorted ascending — switch to descending"
            }
            onClick={() => applyUpdate({ desc: !values.desc, page: 1 })}
          >
            {values.desc ? (
              <ArrowDownWideNarrow aria-hidden className="size-4" />
            ) : (
              <ArrowUpNarrowWide aria-hidden className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {ordersQuery.isPending ? (
        <OrdersSkeleton />
      ) : ordersQuery.isError ? (
        <ErrorState
          error={ordersQuery.error}
          onRetry={() => void ordersQuery.refetch()}
        />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={values.status ? "No orders with this status" : "No orders yet"}
          description={
            values.status
              ? "Try a different status filter."
              : "When you place an order it will show up here."
          }
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/products">Browse products</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {data.data.map((order) => (
              <OrderRow key={order.public_id} order={order} />
            ))}
          </ul>
          <PaginationFromStandard
            pagination={data.pagination}
            onPageChange={(page) => applyUpdate({ page })}
            className="mt-2"
          />
        </>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const previewItems = order.items.slice(0, 3);
  const overflowCount = order.items.length - previewItems.length;

  return (
    <li>
      <Card className="transition-colors hover:border-foreground/20">
        <CardContent>
          <Link
            href={`/orders/${order.public_id}`}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-semibold">
                  {order.order_number}
                </span>
                <StatusBadge value={order.status} />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(order.placed_at)}
                </span>
                <span className="inline-flex items-center gap-1 text-base font-semibold">
                  <Money value={order.total_amount} />
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted-foreground"
                  />
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {previewItems.map((item) => (
                <span
                  key={item.variant_public_id}
                  className="flex flex-wrap items-center gap-1"
                >
                  <Badge
                    variant="outline"
                    className="font-mono text-[0.7rem]"
                  >
                    {item.sku}
                  </Badge>
                  {item.color ? (
                    <Badge variant="secondary">{item.color}</Badge>
                  ) : null}
                  {item.size ? (
                    <Badge variant="secondary">{item.size}</Badge>
                  ) : null}
                </span>
              ))}
              {overflowCount > 0 ? (
                <span className="text-xs text-muted-foreground">
                  +{overflowCount} more item{overflowCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </Link>
        </CardContent>
      </Card>
    </li>
  );
}

function OrdersSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2, 3].map((index) => (
        <li key={index}>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-5 w-64 max-w-full" />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function OrdersContent() {
  return (
    <AuthGate>
      <OrdersBrowser />
    </AuthGate>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersFallback />}>
      <OrdersContent />
    </Suspense>
  );
}

function OrdersFallback() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <OrdersSkeleton />
    </div>
  );
}
