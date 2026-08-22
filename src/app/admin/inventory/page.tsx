"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
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
import { PaginationFromStandard } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { qk } from "@/lib/api/queryKeys";
import type { InventoryListParams, InventoryRecord } from "@/types/inventory";
import { listAdminInventory } from "@/features/admin/inventory-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";
import { AdjustInventoryDialog } from "@/features/admin/inventory-components/adjust-inventory-dialog";
import { ReserveInventoryDialog } from "@/features/admin/inventory-components/reserve-inventory-dialog";
import { CreateInventoryDialog } from "@/features/admin/inventory-components/create-inventory-dialog";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";

const STOCK_STATUSES = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const;
const INVENTORY_SORTS = [
  "product_name",
  "sku",
  "quantity_on_hand",
  "quantity_available",
  "last_stock_update",
] as const;

type InventorySortField = (typeof INVENTORY_SORTS)[number];

function parseSortField(value: string | null): InventorySortField {
  if (
    value !== null &&
    (INVENTORY_SORTS as readonly string[]).includes(value)
  ) {
    return value as InventorySortField;
  }
  return "last_stock_update";
}

function parsePage(value: string | null): number {
  const parsed = Number(value ?? "1");
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 1;
}

function parseStockStatus(value: string | null) {
  if (
    value !== null &&
    (STOCK_STATUSES as readonly string[]).includes(value)
  ) {
    return value as (typeof STOCK_STATUSES)[number];
  }
  return null;
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

function InventoryTable({ onCreate }: { onCreate: () => void }) {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const [adjusting, setAdjusting] = useState<InventoryRecord | null>(null);
  const [reserving, setReserving] = useState<InventoryRecord | null>(null);

  const page = parsePage(searchParams.get("page"));
  const searchTerm = searchParams.get("search") ?? "";
  const stockStatus = parseStockStatus(searchParams.get("stock_status"));
  const includeDeleted = searchParams.get("deleted") === "1";
  const sortField = parseSortField(searchParams.get("sort"));
  const desc = searchParams.get("dir") !== "asc";

  const search = useUrlSyncedInput("search");

  const params: InventoryListParams = {
    page,
    limit: 20,
    ...(searchTerm !== "" ? { search: searchTerm } : {}),
    ...(stockStatus ? { stock_status: stockStatus } : {}),
    sort: sortField,
    desc,
    include_deleted: includeDeleted,
  };

  const query = useQuery({
    queryKey: qk.admin.inventory(params),
    queryFn: () => listAdminInventory(params),
  });

  function changePage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
  }

  const rows = query.data?.data ?? [];
  const hasFilters =
    searchTerm !== "" || stockStatus !== null || includeDeleted;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inventory-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="inventory-search"
              value={search.value}
              placeholder="SKU, barcode or product"
              className="w-60 pl-8"
              autoComplete="off"
              onChange={(e) => search.onChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="inventory-stock-status" className="text-sm font-normal">
            Stock status
          </Label>
          <Select
            value={stockStatus ?? "all"}
            onValueChange={(value) =>
              updateParams({
                stock_status: value === "all" ? null : value,
                page: null,
              })
            }
          >
            <SelectTrigger id="inventory-stock-status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STOCK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace(/_/g, " ").toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="inventory-sort" className="text-sm font-normal">
            Sort
          </Label>
          <Select
            value={sortField}
            onValueChange={(value) => updateParams({ sort: value, page: null })}
          >
            <SelectTrigger id="inventory-sort" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVENTORY_SORTS.map((s) => (
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
        <div className="flex items-center gap-2">
          <Switch
            id="inventory-deleted"
            checked={includeDeleted}
            onCheckedChange={(checked) =>
              updateParams({ deleted: checked ? "1" : null, page: null })
            }
          />
          <Label htmlFor="inventory-deleted" className="text-sm font-normal">
            Include deleted
          </Label>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No inventory records match your filters"
            description="Try adjusting the search or filters."
          />
        ) : (
          <EmptyState
            icon={Warehouse}
            title="No inventory records yet"
            description="Stock is never tracked automatically. Add variants to your products first, then create an inventory record for each variant you want to track."
            action={
              <Button onClick={onCreate}>
                <Plus className="size-4" aria-hidden />
                Create a record
              </Button>
            }
          />
        )
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU / Barcode</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reorder at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last update</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((record) => (
                <TableRow
                  key={record.public_id}
                  className={includeDeleted ? "opacity-50" : undefined}
                >
                  <TableCell className="max-w-56 truncate font-medium">
                    <Link
                      href={`/admin/products/${record.product_public_id}`}
                      className="hover:underline"
                    >
                      {record.product_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs">{record.sku}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {record.barcode ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {record.quantity_on_hand}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {record.quantity_reserved}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {record.quantity_available}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {record.reorder_level ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={record.stock_status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(record.last_stock_update)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdjusting(record)}
                      >
                        Adjust
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReserving(record)}
                      >
                        Reserve
                      </Button>
                    </div>
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

      {adjusting ? (
        <AdjustInventoryDialog
          open
          record={adjusting}
          onOpenChange={(open) => {
            if (!open) setAdjusting(null);
          }}
        />
      ) : null}

      {reserving ? (
        <ReserveInventoryDialog
          open
          variantPublicId={reserving.public_id}
          title={`${reserving.product_name} · ${reserving.sku}`}
          onOpenChange={(open) => {
            if (!open) setReserving(null);
          }}
        />
      ) : null}
    </div>
  );
}

function InventoryPageContent() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track stock per variant — on hand, reserved and available.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          New record
        </Button>
      </div>
      <InventoryTable onCreate={() => setCreateOpen(true)} />
      <CreateInventoryDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export default function AdminInventoryPage() {
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
      <InventoryPageContent />
    </Suspense>
  );
}
