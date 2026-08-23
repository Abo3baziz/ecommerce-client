"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { Money } from "@/components/shared/money";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import {
  createCoupon,
  deleteCoupon,
  listAdminCoupons,
  listCouponUsages,
  updateCoupon,
} from "@/features/admin/coupons-api";
import type {
  AdminCoupon,
  AdminCouponUsage,
  CouponDiscountType,
  CouponStatus,
} from "@/types";
import type { ApiError } from "@/types/envelopes";

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function parseStatus(value: string | null): CouponStatus | undefined {
  return value === "ACTIVE" || value === "INACTIVE" || value === "EXPIRED" ||
    value === "USAGE_LIMIT_REACHED"
    ? value
    : undefined;
}

export default function CouponsPage() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const currentSearch = searchParams.get("search") ?? "";

  useEffect(() => {
    if ((debouncedSearch !== "" || currentSearch !== "") && debouncedSearch !== currentSearch) {
      updateParams({ search: debouncedSearch === "" ? null : debouncedSearch, page: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const page = parsePage(searchParams.get("page"));
  const status = parseStatus(searchParams.get("status"));
  const includeDeleted = searchParams.get("deleted") === "1";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [usageFor, setUsageFor] = useState<AdminCoupon | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);

  const query = useQuery({
    queryKey: [
      "admin-coupons",
      { page, search: currentSearch, status, includeDeleted },
    ],
    queryFn: () =>
      listAdminCoupons({
        page,
        limit: 20,
        search: currentSearch || undefined,
        status,
        include_deleted: includeDeleted,
      }),
    placeholderData: (previous) => previous,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteCoupon(deleting.public_id);
      toast.success("Coupon deleted");
    } catch (error) {
      const err = error as ApiError;
      toast.error(err.message || "Could not delete the coupon.");
    }
    setDeleting(null);
    await invalidate();
  }

  async function handleToggleActive(coupon: AdminCoupon) {
    try {
      await updateCoupon(coupon.public_id, { is_active: !coupon.is_active });
      toast.success(coupon.is_active ? "Coupon deactivated" : "Coupon activated");
      await invalidate();
    } catch (error) {
      const err = error as ApiError;
      toast.error(err.message || "Could not update the coupon.");
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discount codes customers can apply at checkout.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          New coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Coupon list</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              aria-label="Search by code"
              placeholder="Search code…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-52"
            />
            <Select
              value={status ?? "all"}
              onValueChange={(value) =>
                updateParams({ status: value === "all" ? null : value, page: null })
              }
            >
              <SelectTrigger aria-label="Filter by status" className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="USAGE_LIMIT_REACHED">Limit reached</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={includeDeleted}
                onCheckedChange={(checked) =>
                  updateParams({ deleted: checked ? "1" : null, page: null })
                }
              />
              Include deleted
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : query.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : query.data.data.length === 0 ? (
            <EmptyState
              title={currentSearch || status ? "No coupons match these filters" : "No coupons yet"}
              description={
                currentSearch || status
                  ? "Try adjusting or clearing the filters."
                  : "Create a discount code to run your first promotion."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Min order</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.data.map((coupon) => (
                    <TableRow
                      key={coupon.public_id}
                      className={cn(
                        coupon.deleted_at !== null && "opacity-50",
                      )}
                    >
                      <TableCell className="font-mono font-medium">
                        {coupon.code}
                        {coupon.deleted_at !== null ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            deleted
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {coupon.discount_type === "PERCENTAGE"
                          ? `${Number(coupon.discount_value)}%`
                          : <Money value={coupon.discount_value} />}
                      </TableCell>
                      <TableCell>
                        {coupon.minimum_order_amount === null ? (
                          "—"
                        ) : (
                          <Money value={coupon.minimum_order_amount} />
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {coupon.usage_count}/{coupon.usage_limit}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {coupon.starts_at ? coupon.starts_at.slice(0, 10) : "…"} →{" "}
                        {coupon.expires_at ? coupon.expires_at.slice(0, 10) : "∞"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={coupon.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Switch
                              checked={coupon.is_active}
                              disabled={coupon.deleted_at !== null}
                              onCheckedChange={() => void handleToggleActive(coupon)}
                            />
                            Active
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsageFor(coupon)}
                          >
                            Usage
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={coupon.deleted_at !== null}
                            onClick={() => {
                              setEditing(coupon);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={coupon.deleted_at !== null}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleting(coupon)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationFromStandard
                pagination={query.data.pagination}
                onPageChange={(next) => updateParams({ page: String(next) })}
              />
            </>
          )}
        </CardContent>
      </Card>

      <CouponFormDialog
        open={formOpen}
        coupon={editing}
        onClose={() => {
          setEditing(null);
          setFormOpen(false);
        }}
        onSaved={invalidate}
      />

      <UsageDrawer
        coupon={usageFor}
        onClose={() => setUsageFor(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this coupon?"
        description={
          deleting
            ? `"${deleting.code}" will be soft-deleted and stop working at checkout. Its redemption history stays available via the include-deleted toggle.`
            : undefined
        }
        confirmLabel="Delete coupon"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

interface CouponFormValues {
  code: string;
  discount_type: CouponDiscountType;
  discount_value: string;
  minimum_order_amount: string;
  maximum_discount_amount: string;
  usage_limit: string;
  usage_limit_per_user: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

function valuesFromCoupon(coupon: AdminCoupon | null): CouponFormValues {
  if (!coupon) {
    return {
      code: "",
      discount_type: "PERCENTAGE",
      discount_value: "10",
      minimum_order_amount: "",
      maximum_discount_amount: "",
      usage_limit: "100",
      usage_limit_per_user: "1",
      starts_at: new Date().toISOString().slice(0, 10),
      expires_at: "",
      is_active: true,
    };
  }
  return {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: String(Number(coupon.discount_value)),
    minimum_order_amount:
      coupon.minimum_order_amount === null ? "" : String(Number(coupon.minimum_order_amount)),
    maximum_discount_amount:
      coupon.maximum_discount_amount === null
        ? ""
        : String(Number(coupon.maximum_discount_amount)),
    usage_limit: String(coupon.usage_limit),
    usage_limit_per_user: String(coupon.usage_limit_per_user),
    starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 10) : "",
    expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
    is_active: coupon.is_active,
  };
}

function validate(values: CouponFormValues, codeLocked: boolean): Partial<
  Record<keyof CouponFormValues, string>
> {
  const errors: Partial<Record<keyof CouponFormValues, string>> = {};
  const codePattern = /^[A-Za-z0-9_-]{3,50}$/;
  if (!codeLocked && !codePattern.test(values.code)) {
    errors.code = "3-50 characters; letters, numbers, dashes, underscores.";
  }
  const value = Number(values.discount_value);
  if (!Number.isFinite(value) || value <= 0) {
    errors.discount_value = "Enter a positive number.";
  } else if (values.discount_type === "PERCENTAGE" && value > 100) {
    errors.discount_value = "Percentage cannot exceed 100.";
  }
  if (
    values.minimum_order_amount !== "" &&
    (!Number.isFinite(Number(values.minimum_order_amount)) ||
      Number(values.minimum_order_amount) < 0)
  ) {
    errors.minimum_order_amount = "Enter a non-negative amount.";
  }
  if (
    values.maximum_discount_amount !== "" &&
    (!Number.isFinite(Number(values.maximum_discount_amount)) ||
      Number(values.maximum_discount_amount) <= 0)
  ) {
    errors.maximum_discount_amount = "Enter a positive amount.";
  }
  if (!/^\d+$/.test(values.usage_limit) || Number(values.usage_limit) < 1) {
    errors.usage_limit = "Enter a whole number ≥ 1.";
  }
  if (
    !/^\d+$/.test(values.usage_limit_per_user) ||
    Number(values.usage_limit_per_user) < 1
  ) {
    errors.usage_limit_per_user = "Enter a whole number ≥ 1.";
  }
  if (
    values.starts_at !== "" &&
    values.expires_at !== "" &&
    values.expires_at <= values.starts_at
  ) {
    errors.expires_at = "Expiry must be after the start date.";
  }
  return errors;
}

function CouponFormDialog({
  open,
  coupon,
  onClose,
  onSaved,
}: {
  open: boolean;
  coupon: AdminCoupon | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  if (!open) return null;
  const isEdit = coupon !== null;
  // Code locks once the coupon has redemptions.
  const codeLocked = isEdit && coupon!.usage_count > 0;

  return (
    <CouponFormDialogInner
      key={coupon?.public_id ?? "new-coupon"}
      initial={valuesFromCoupon(coupon)}
      isEdit={isEdit}
      codeLocked={codeLocked}
      coupon={coupon}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function CouponFormDialogInner({
  initial,
  isEdit,
  codeLocked,
  coupon,
  onClose,
  onSaved,
}: {
  initial: CouponFormValues;
  isEdit: boolean;
  codeLocked: boolean;
  coupon: AdminCoupon | null;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const [values, setValues] = useState<CouponFormValues>(initial);

  const errors = validate(values, codeLocked);
  const valid = Object.keys(errors).length === 0;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: values.code.trim().toUpperCase(),
        discount_type: values.discount_type,
        discount_value: Number(values.discount_value),
        ...(values.minimum_order_amount !== ""
          ? { minimum_order_amount: Number(values.minimum_order_amount) }
          : {}),
        ...(values.maximum_discount_amount !== ""
          ? { maximum_discount_amount: Number(values.maximum_discount_amount) }
          : {}),
        usage_limit: Number(values.usage_limit),
        usage_limit_per_user: Number(values.usage_limit_per_user),
        ...(values.starts_at !== "" ? { starts_at: `${values.starts_at}T00:00:00.000Z` } : {}),
        ...(values.expires_at !== "" ? { expires_at: `${values.expires_at}T23:59:59.999Z` } : {}),
        is_active: values.is_active,
      };
      return isEdit && coupon
        ? updateCoupon(coupon.public_id, payload)
        : createCoupon(payload);
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Coupon updated" : "Coupon created");
      await onSaved();
      onClose();
    },
    onError: (error) => {
      const err = error as unknown as ApiError;
      if (err.status === 409) {
        toast.error(
          err.message.includes("code")
            ? err.message
            : "That code is taken — pick another.",
        );
      } else {
        toast.error(err.message || "Could not save the coupon.");
      }
    },
  });

  function set<K extends keyof CouponFormValues>(key: K, value: CouponFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${coupon?.code}` : "New coupon"}</DialogTitle>
          <DialogDescription>
            {isEdit && codeLocked
              ? "This coupon has redemptions — its code is locked."
              : "Customers enter this code at checkout."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) mutation.mutate();
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field label="Code" error={errors.code}>
            <Input
              id="coupon-code"
              value={values.code}
              disabled={isEdit && codeLocked}
              autoComplete="off"
              className="font-mono uppercase"
              placeholder="SUMMER10"
              onChange={(e) =>
                set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Discount type">
              <Select
                value={values.discount_type}
                onValueChange={(value) =>
                  set("discount_type", value as CouponDiscountType)
                }
              >
                <SelectTrigger id="coupon-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={
                values.discount_type === "PERCENTAGE"
                  ? "Percent off"
                  : "Amount off"
              }
              error={errors.discount_value}
            >
              <Input
                id="coupon-value"
                inputMode="decimal"
                value={values.discount_value}
                onChange={(e) => set("discount_value", e.target.value)}
              />
            </Field>
          </div>

          {values.discount_type === "PERCENTAGE" ? (
            <Field
              label="Maximum discount (cap)"
              error={errors.maximum_discount_amount}
            >
              <Input
                id="coupon-max-discount"
                inputMode="decimal"
                value={values.maximum_discount_amount}
                placeholder="Optional cap, e.g. 200"
                onChange={(e) => set("maximum_discount_amount", e.target.value)}
              />
            </Field>
          ) : null}

          <Field label="Minimum order amount" error={errors.minimum_order_amount}>
            <Input
              id="coupon-min-order"
              inputMode="decimal"
              value={values.minimum_order_amount}
              placeholder="Optional, e.g. 250"
              onChange={(e) => set("minimum_order_amount", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Total usage limit" error={errors.usage_limit}>
              <Input
                id="coupon-usage-limit"
                inputMode="numeric"
                value={values.usage_limit}
                onChange={(e) => set("usage_limit", e.target.value)}
              />
            </Field>
            <Field label="Per-user limit" error={errors.usage_limit_per_user}>
              <Input
                id="coupon-user-limit"
                inputMode="numeric"
                value={values.usage_limit_per_user}
                onChange={(e) => set("usage_limit_per_user", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Starts at" error={errors.starts_at}>
              <Input
                id="coupon-starts"
                type="date"
                value={values.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
              />
            </Field>
            <Field label="Expires at" error={errors.expires_at}>
              <Input
                id="coupon-expires"
                type="date"
                value={values.expires_at}
                onChange={(e) => set("expires_at", e.target.value)}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={values.is_active}
              onCheckedChange={(checked) => set("is_active", checked)}
            />
            Active (redeemable at checkout)
          </label>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function UsageDrawer({
  coupon,
  onClose,
}: {
  coupon: AdminCoupon | null;
  onClose: () => void;
}) {
  if (coupon === null) return null;
  return (
    <UsageDrawerInner
      key={coupon.public_id}
      coupon={coupon}
      onClose={onClose}
    />
  );
}

function UsageDrawerInner({
  coupon,
  onClose,
}: {
  coupon: AdminCoupon;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin-coupon-usages", coupon.public_id, page],
    queryFn: () => listCouponUsages(coupon.public_id, page),
    placeholderData: (previous) => previous,
  });

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-mono">{coupon.code}</DrawerTitle>
            <DrawerDescription>
              Redemption history, newest first ({coupon.usage_count} total)
            </DrawerDescription>
          </DrawerHeader>
          {query.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : query.isError ? (
            <ErrorState
              error={query.error}
              onRetry={() => void query.refetch()}
            />
          ) : query.data.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              This coupon has not been redeemed yet.
            </p>
          ) : (
            <>
              <ul className="divide-y rounded-lg border">
                {query.data.data.map((usage: AdminCouponUsage) => (
                  <li
                    key={usage.order_public_id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <Link
                        href={`/admin/orders/${usage.order_public_id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {usage.order_number}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {usage.customer_name} · {usage.customer_email}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Money value={usage.discount_amount} className="font-medium" />
                      <span className="block text-xs text-muted-foreground">
                        {formatDateTime(usage.redeemed_at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <PaginationFromStandard
                pagination={query.data.pagination}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
