"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Plus } from "lucide-react";
import { toast } from "sonner";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { qk } from "@/lib/api/queryKeys";
import type { AdminCategoryListParams, ApiError } from "@/types";
import type { AdminCategory } from "@/types/catalog";
import {
  deleteAdminCategory,
  listAdminCategories,
  updateAdminCategory,
} from "@/features/admin/categories-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/format";
import { CategoryFormDialog } from "@/features/admin/category-components/category-form-dialog";
import { CategoryProductsDialog } from "@/features/admin/category-components/category-products-dialog";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";

const CATEGORY_SORTS = ["name", "created_at", "updated_at"] as const;
type CategorySortField = (typeof CATEGORY_SORTS)[number];

type CategoryRow = AdminCategory & { product_count?: number };

function parseSortField(value: string | null): CategorySortField {
  if (value !== null && (CATEGORY_SORTS as readonly string[]).includes(value)) {
    return value as CategorySortField;
  }
  return "name";
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

function CategoriesTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [managingProductsFor, setManagingProductsFor] =
    useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const page = parsePage(searchParams.get("page"));
  const searchTerm = searchParams.get("search") ?? "";
  const includeDeleted = searchParams.get("deleted") === "1";
  const sortField = parseSortField(searchParams.get("sort"));
  const desc = searchParams.get("dir") === "desc";

  const search = useUrlSyncedInput("search");

  const params: AdminCategoryListParams = {
    page,
    limit: 20,
    ...(searchTerm !== "" ? { search: searchTerm } : {}),
    sort: sortField,
    desc,
    include_deleted: includeDeleted,
  };

  const query = useQuery({
    queryKey: qk.admin.categories(params),
    queryFn: () => listAdminCategories(params),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      updateAdminCategory(id, { is_active: next }),
    onMutate: async ({ id, next }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-categories"] });
      const snapshots = queryClient.getQueriesData<{
        data: AdminCategory[];
        pagination: unknown;
      }>({ queryKey: ["admin-categories"] });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<typeof data>(key, {
          ...data,
          data: data.data.map((category) =>
            category.public_id === id
              ? { ...category, is_active: next }
              : category,
          ),
        });
      }
      return { snapshots };
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.next
          ? "Category is now visible on the storefront"
          : "Category hidden from the storefront",
      );
    },
    onError: (error: ApiError, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(error.message || "Could not update visibility.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  function handleToggle(category: AdminCategory, next: boolean) {
    setTogglingId(category.public_id);
    toggleActiveMutation.mutate(
      { id: category.public_id, next },
      { onSettled: () => setTogglingId(null) },
    );
  }

  function changePage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
  }

  const rows = query.data?.data ?? [];
  const hasFilters = searchTerm !== "" || includeDeleted;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-search">Search</Label>
          <Input
            id="category-search"
            value={search.value}
            placeholder="Name or slug"
            className="w-56"
            autoComplete="off"
            onChange={(e) => search.onChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="category-sort" className="text-sm font-normal">
            Sort
          </Label>
          <Select
            value={sortField}
            onValueChange={(value) => updateParams({ sort: value, page: null })}
          >
            <SelectTrigger id="category-sort" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={desc ? "desc" : "asc"}
            onValueChange={(value) =>
              updateParams({ dir: value === "desc" ? "desc" : null, page: null })
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
            id="categories-deleted"
            checked={includeDeleted}
            onCheckedChange={(checked) =>
              updateParams({ deleted: checked ? "1" : null, page: null })
            }
          />
          <Label htmlFor="categories-deleted" className="text-sm font-normal">
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
          icon={FolderTree}
          title={
            hasFilters
              ? "No categories match your filters"
              : "No categories yet"
          }
          description={
            hasFilters
              ? "Try adjusting the search or deleted filter."
              : "Create your first category to organize the catalog."
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((category) => (
                <TableRow
                  key={category.public_id}
                  className={includeDeleted ? "opacity-50" : undefined}
                >
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {category.slug}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.is_active}
                      disabled={
                        togglingId === category.public_id &&
                        toggleActiveMutation.isPending
                      }
                      aria-label={`Toggle visibility for ${category.name}`}
                      onCheckedChange={(checked) =>
                        handleToggle(category, checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {(category as CategoryRow).product_count ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(category.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingProductsFor(category)}
                      >
                        Products
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(category)}
                      >
                        Delete
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

      {editing ? (
        <CategoryFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          category={editing}
        />
      ) : null}

      {managingProductsFor ? (
        <CategoryProductsDialog
          open
          onOpenChange={(open) => {
            if (!open) setManagingProductsFor(null);
          }}
          categoryId={managingProductsFor.public_id}
          categoryName={managingProductsFor.name}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="Deleting this category also removes its product links. The products themselves stay, but they will no longer belong to this category."
        confirmLabel="Delete category"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteAdminCategory(deleting.public_id);
            toast.success("Category deleted");
            await queryClient.invalidateQueries({
              queryKey: ["admin-categories"],
            });
            await queryClient.invalidateQueries({ queryKey: qk.categories() });
          } catch (error) {
            const apiError = error as ApiError;
            toast.error(apiError.message || "Could not delete the category.");
            throw error;
          }
        }}
      />
    </div>
  );
}

function CategoriesPageContent() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize products into storefront categories.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden />
          New category
        </Button>
      </div>
      <CategoriesTable />
      <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export default function AdminCategoriesPage() {
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
      <CategoriesPageContent />
    </Suspense>
  );
}
