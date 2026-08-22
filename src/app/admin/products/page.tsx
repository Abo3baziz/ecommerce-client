"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Package, Plus, Search } from "lucide-react";
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
import { qk } from "@/lib/api/queryKeys";
import type { AdminProductListParams } from "@/types/catalog";
import { listAdminProducts } from "@/features/admin/products-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatRelative } from "@/lib/format";
import { CreateProductDialog } from "@/features/admin/product-components/create-product-dialog";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";

const PRODUCT_SORTS = ["name", "created_at", "updated_at"] as const;
type ProductSortField = (typeof PRODUCT_SORTS)[number];

function parseSortField(value: string | null): ProductSortField {
  if (value !== null && (PRODUCT_SORTS as readonly string[]).includes(value)) {
    return value as ProductSortField;
  }
  return "created_at";
}

function parsePage(value: string | null): number {
  const parsed = Number(value ?? "1");
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 1;
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

function ProductsTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const page = parsePage(searchParams.get("page"));
  const brand = searchParams.get("brand") ?? "";
  const searchTerm = searchParams.get("search") ?? "";
  const includeDeleted = searchParams.get("deleted") === "1";
  const sortField = parseSortField(searchParams.get("sort"));
  const desc = searchParams.get("dir") !== "asc";

  const search = useUrlSyncedInput("search");
  const brandInput = useUrlSyncedInput("brand");

  const params: AdminProductListParams = {
    page,
    limit: 20,
    ...(searchTerm !== "" ? { search: searchTerm } : {}),
    ...(brand !== "" ? { brand } : {}),
    sort: sortField,
    desc,
    include_deleted: includeDeleted,
  };

  const query = useQuery({
    queryKey: qk.admin.products(params),
    queryFn: () => listAdminProducts(params),
  });

  function changePage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
  }

  const rows = query.data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="product-search"
              value={search.value}
              placeholder="Name or slug"
              className="w-56 pl-8"
              autoComplete="off"
              onChange={(e) => search.onChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-brand">Brand</Label>
          <Input
            id="product-brand"
            value={brandInput.value}
            placeholder="Brand"
            className="w-44"
            autoComplete="off"
            onChange={(e) => brandInput.onChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="product-sort" className="text-sm font-normal">
            Sort
          </Label>
          <Select
            value={sortField}
            onValueChange={(value) => updateParams({ sort: value, page: null })}
          >
            <SelectTrigger id="product-sort" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_SORTS.map((s) => (
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
            id="products-deleted"
            checked={includeDeleted}
            onCheckedChange={(checked) =>
              updateParams({ deleted: checked ? "1" : null, page: null })
            }
          />
          <Label htmlFor="products-deleted" className="text-sm font-normal">
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
        <EmptyState
          icon={Package}
          title={
            search.value.trim() !== "" || brand !== ""
              ? "No products match your filters"
              : "No products yet"
          }
          description={
            search.value.trim() !== "" || brand !== ""
              ? "Try adjusting the search or brand filter."
              : "Create your first product to start building the catalog."
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((product) => (
                <TableRow
                  key={product.public_id}
                  className={includeDeleted ? "opacity-50" : undefined}
                >
                  <TableCell>
                    <span className="flex size-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                      <Package className="size-5" aria-hidden />
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/products/${product.public_id}`}
                      className="hover:underline"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.slug}
                  </TableCell>
                  <TableCell>{product.brand ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelative(product.updated_at)}
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

function ProductsPageContent() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the catalog, its variants and imagery.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          New product
        </Button>
      </div>
      <ProductsTable />
      <CreateProductDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export default function AdminProductsPage() {
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
      <ProductsPageContent />
    </Suspense>
  );
}
