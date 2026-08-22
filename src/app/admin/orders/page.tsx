"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { qk } from "@/lib/api/queryKeys";
import type { AdminOrderListParams } from "@/types/orders";
import type { OrderStatus } from "@/types/enums";
import { ORDER_STATUSES } from "@/types/enums";
import { listAdminOrders } from "@/features/admin/orders-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";

const ORDER_SORTS = [
  "placed_at",
  "order_number",
  "total_amount",
  "customer_name",
] as const;

type OrderSortField = (typeof ORDER_SORTS)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseSortField(value: string | null): OrderSortField {
  if (value !== null && (ORDER_SORTS as readonly string[]).includes(value)) {
    return value as OrderSortField;
  }
  return "placed_at";
}

function parsePage(value: string | null): number {
  const parsed = Number(value ?? "1");
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 1;
}

function parseStatus(value: string | null): OrderStatus | null {
  if (
    value !== null &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  ) {
    return value as OrderStatus;
  }
  return null;
}

function parseDateParam(value: string | null): string | null {
  return value !== null && DATE_PATTERN.test(value) ? value : null;
}

function useUrlSyncedInput(key: string) {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const urlValue = searchParams.get(key) ?? "";
  const [input, setInput] = useState(urlValue);
  const debouncedInput = useDebouncedValue(input, 300);

  useEffect(() => {
    if (debouncedInput !== urlValue) {
      updateParams({
        [key]: debouncedInput.trim() === "" ? null : debouncedInput.trim(),
        page: null,
      });
    }
  }, [debouncedInput, urlValue, key, updateParams]);

  return { value: input, onChange: setInput };
}

function OrdersTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const page = parsePage(searchParams.get("page"));
  const status = parseStatus(searchParams.get("status"));
  const searchTerm = searchParams.get("search") ?? "";
  const rawFrom = searchParams.get("placed_from");
  const rawTo = searchParams.get("placed_to");
  const placedFrom = parseDateParam(rawFrom);
  const placedTo = parseDateParam(rawTo);
  const sortField = parseSortField(searchParams.get("sort"));
  const desc = searchParams.get("dir") !== "asc";

  const dateRangeInvalid =
    placedFrom !== null &&
    placedTo !== null &&
    placedFrom > placedTo;

  const search = useUrlSyncedInput("search");

  const params: AdminOrderListParams = {
    page,
    limit: 20,
    ...(status ? { status } : {}),
    ...(searchTerm !== "" ? { search: searchTerm } : {}),
    ...(!dateRangeInvalid && placedFrom !== null
      ? { placed_from: placedFrom }
      : {}),
    ...(!dateRangeInvalid && placedTo !== null ? { placed_to: placedTo } : {}),
    sort: sortField,
    desc,
  };

  const query = useQuery({
    queryKey: qk.admin.orders(params),
    queryFn: () => listAdminOrders(params),
  });

  function changePage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
  }

  const rows = query.data?.data ?? [];
  const hasFilters =
    status !== null ||
    searchTerm !== "" ||
    placedFrom !== null ||
    placedTo !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="order-search"
              value={search.value}
              placeholder="Order number or customer"
              className="w-60 pl-8"
              autoComplete="off"
              onChange={(e) => search.onChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="order-status" className="text-sm font-normal">
            Status
          </Label>
          <Select
            value={status ?? "all"}
            onValueChange={(value) =>
              updateParams({ status: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger id="order-status" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-placed-from">Placed from</Label>
          <Input
            id="order-placed-from"
            type="date"
            value={placedFrom ?? ""}
            className="w-40"
            onChange={(e) =>
              updateParams({
                placed_from: e.target.value === "" ? null : e.target.value,
                page: null,
              })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-placed-to">Placed to</Label>
          <Input
            id="order-placed-to"
            type="date"
            value={placedTo ?? ""}
            className="w-40"
            onChange={(e) =>
              updateParams({
                placed_to: e.target.value === "" ? null : e.target.value,
                page: null,
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="order-sort" className="text-sm font-normal">
            Sort
          </Label>
          <Select
            value={sortField}
            onValueChange={(value) => updateParams({ sort: value, page: null })}
          >
            <SelectTrigger id="order-sort" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={desc ? "desc" : "asc"}
            onValueChange={(value) =>
              updateParams({ dir: value === "desc" ? null : "asc", page: null })
            }
          >
            <SelectTrigger aria-label="Sort direction" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {dateRangeInvalid ? (
        <p role="alert" className="text-sm text-destructive">
          “Placed from” must be on or before “Placed to” — the date range is
          ignored until fixed.
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={
            hasFilters ? "No orders match your filters" : "No orders yet"
          }
          description={
            hasFilters
              ? "Try adjusting the search, status or date range."
              : "Orders will appear here once customers check out."
          }
        />
      ) : (
        <>
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
              {rows.map((order) => (
                <TableRow key={order.public_id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/orders/${order.public_id}`}
                      className="font-mono hover:underline"
                    >
                      {order.order_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p>{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_email}
                    </p>
                  </TableCell>
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
          {query.data ? (
            <PaginationFromStandard
              pagination={query.data.pagination}
              onPageChange={changePage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function OrdersPageContent() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review incoming orders and move them through fulfilment.
        </p>
      </div>
      <OrdersTable />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}
