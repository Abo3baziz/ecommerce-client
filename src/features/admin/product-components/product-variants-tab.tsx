"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Images,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { qk } from "@/lib/api/queryKeys";
import { VARIANT_STATUSES } from "@/types/enums";
import type { AdminVariant } from "@/types/catalog";
import type { VariantStatus } from "@/types/enums";
import type { ApiError } from "@/types/envelopes";
import {
  deleteAdminVariant,
  listAdminVariants,
} from "@/features/admin/products-api";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import { VariantDialog } from "@/features/admin/product-components/variant-dialog";
import { VariantImagesManager } from "@/features/admin/product-components/variant-images-manager";
import { ReserveInventoryDialog } from "@/features/admin/inventory-components/reserve-inventory-dialog";

const VARIANT_SORTS = ["sku", "price", "created_at", "updated_at"] as const;
type VariantSortField = (typeof VARIANT_SORTS)[number];

function parseSortField(value: string | null): VariantSortField {
  if (value !== null && (VARIANT_SORTS as readonly string[]).includes(value)) {
    return value as VariantSortField;
  }
  return "created_at";
}

function parseStatus(value: string | null): VariantStatus | "" {
  if (
    value !== null &&
    value !== "" &&
    (VARIANT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as VariantStatus;
  }
  return "";
}

export function ProductVariantsTab({ productId }: { productId: string }) {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const queryClient = useQueryClient();

  const status = parseStatus(searchParams.get("status"));
  const includeDeleted = searchParams.get("deleted") === "1";
  const sortField = parseSortField(searchParams.get("sort"));
  const desc = searchParams.get("dir") === "desc";
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<AdminVariant | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminVariant | null>(null);
  const [reservingVariant, setReservingVariant] = useState<AdminVariant | null>(
    null,
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: qk.admin.variants(productId, {
      page,
      limit: 20,
      status: status || undefined,
      include_deleted: includeDeleted || undefined,
      sort: sortField,
      desc,
    }),
    queryFn: () =>
      listAdminVariants(productId, {
        page,
        limit: 20,
        ...(status !== "" ? { status } : {}),
        include_deleted: includeDeleted,
        sort: sortField,
        desc,
      }),
  });

  function changePage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteAdminVariant(productId, pendingDelete.public_id);
      toast.success("Variant deleted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.admin.variants(productId) }),
        queryClient.invalidateQueries({ queryKey: qk.admin.product(productId) }),
      ]);
      if (expandedId === pendingDelete.public_id) setExpandedId(null);
    } catch (error) {
      const err = error as ApiError;
      toast.error(err.message || "Could not delete the variant.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Switch
            id="variants-deleted"
            checked={includeDeleted}
            onCheckedChange={(checked) =>
              updateParams({ deleted: checked ? "1" : null, page: null })
            }
          />
          <Label htmlFor="variants-deleted" className="text-sm font-normal">
            Include deleted
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="variants-status" className="text-sm font-normal">
            Status
          </Label>
          <Select
            value={status}
            onValueChange={(value) =>
              updateParams({ status: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger id="variants-status" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {VARIANT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="variants-sort" className="text-sm font-normal">
            Sort
          </Label>
          <Select
            value={sortField}
            onValueChange={(value) => updateParams({ sort: value, page: null })}
          >
            <SelectTrigger id="variants-sort" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VARIANT_SORTS.map((s) => (
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
        <Button
          className="ml-auto"
          onClick={() => {
            setEditingVariant(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          New variant
        </Button>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data && query.data.data.length === 0 ? (
        <EmptyState
          title="No variants yet"
          description="Add the first variant to start selling this product."
        />
      ) : query.data ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((variant) => (
                <VariantRows
                  key={variant.public_id}
                  productId={productId}
                  variant={variant}
                  dimmed={includeDeleted}
                  expanded={expandedId === variant.public_id}
                  onToggleExpand={() =>
                    setExpandedId((current) =>
                      current === variant.public_id ? null : variant.public_id,
                    )
                  }
                  onEdit={() => {
                    setEditingVariant(variant);
                    setDialogOpen(true);
                  }}
                  onDelete={() => setPendingDelete(variant)}
                  onReserve={() => setReservingVariant(variant)}
                />
              ))}
            </TableBody>
          </Table>
          <PaginationFromStandard
            pagination={query.data.pagination}
            onPageChange={changePage}
          />
        </>
      ) : null}

      {dialogOpen ? (
        <VariantDialog
          key={editingVariant?.public_id ?? "new-variant"}
          productId={productId}
          variant={editingVariant}
          open
          onOpenChange={setDialogOpen}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this variant?"
        description={
          pendingDelete
            ? `Variant "${pendingDelete.sku}" will be soft-deleted and hidden from the store and checkout.`
            : undefined
        }
        confirmLabel="Delete variant"
        destructive
        onConfirm={async () => {
          await confirmDelete().catch(() => undefined);
        }}
      />

      <ReserveInventoryDialog
        open={reservingVariant !== null}
        variantPublicId={reservingVariant?.public_id ?? ""}
        title={reservingVariant?.sku ?? undefined}
        onOpenChange={(open) => {
          if (!open) setReservingVariant(null);
        }}
      />
    </div>
  );
}

function VariantRows({
  productId,
  variant,
  dimmed,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onReserve,
}: {
  productId: string;
  variant: AdminVariant;
  dimmed: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReserve: () => void;
}) {
  return (
    <>
      <TableRow className={dimmed ? "opacity-50" : undefined}>
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} images for ${variant.sku}`}
            onClick={onToggleExpand}
          >
            {expanded ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{variant.sku}</TableCell>
        <TableCell>{variant.barcode ?? "—"}</TableCell>
        <TableCell>{variant.color ?? "—"}</TableCell>
        <TableCell>{variant.size ?? "—"}</TableCell>
        <TableCell>
          <Money value={variant.price} />
        </TableCell>
        <TableCell>{variant.discount_percentage ?? "—"}</TableCell>
        <TableCell>
          <StatusBadge value={variant.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleExpand}
              title="Manage images"
            >
              <Images className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onReserve}
              title="Manage reserve"
            >
              <Lock className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onEdit}
              title="Edit variant"
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete variant"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={9} className="p-0">
            <VariantImagesManager
              productId={productId}
              variantId={variant.public_id}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
