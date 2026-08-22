"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/shared/error-state";
import { qk } from "@/lib/api/queryKeys";
import { cn } from "@/lib/utils";
import {
  getAdminInventory,
  reserveAdminInventory,
} from "@/features/admin/inventory-api";
import type { ApiError } from "@/types/envelopes";

const SIGNED_INT_PATTERN = /^[+-]?\d+$/;

interface ReserveInventoryDialogProps {
  variantPublicId: string;
  /** Optional label shown in the header (product name · sku) when known. */
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReserveInventoryDialog({
  variantPublicId,
  title,
  open,
  onOpenChange,
}: ReserveInventoryDialogProps) {
  if (!open) return null;
  return (
    <ReserveInventoryDialogInner
      key={variantPublicId}
      variantPublicId={variantPublicId}
      title={title}
      onOpenChange={onOpenChange}
    />
  );
}

function ReserveInventoryDialogInner({
  variantPublicId,
  title,
  onOpenChange,
}: Omit<ReserveInventoryDialogProps, "open">) {
  const queryClient = useQueryClient();
  const [changeValue, setChangeValue] = useState("");
  const [reason, setReason] = useState("");

  const recordQuery = useQuery({
    queryKey: qk.admin.inventoryRecord(variantPublicId),
    queryFn: () => getAdminInventory(variantPublicId),
    retry: false,
  });

  const parsedChange =
    SIGNED_INT_PATTERN.test(changeValue.trim()) && changeValue.trim() !== ""
      ? Number(changeValue)
      : null;

  const record = recordQuery.data;
  const maxReserve = record ? record.quantity_on_hand - record.quantity_reserved : 0;
  const maxRelease = record ? record.quantity_reserved : 0;

  const overReserve =
    parsedChange !== null && record !== undefined && parsedChange > maxReserve;
  const overRelease =
    parsedChange !== null && record !== undefined && -parsedChange > maxRelease;
  const invalid =
    parsedChange === null || parsedChange === 0 || overReserve || overRelease;

  const nextReserved =
    parsedChange !== null && record ? record.quantity_reserved + parsedChange : null;
  const nextAvailable =
    parsedChange !== null && record ? record.quantity_available - parsedChange : null;

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] }),
      queryClient.invalidateQueries({
        queryKey: qk.admin.inventoryRecord(variantPublicId),
      }),
    ]);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof reserveAdminInventory>[1] = {
        change: parsedChange ?? 0,
      };
      if (reason.trim() !== "") {
        payload.reason = reason.trim();
      }
      return reserveAdminInventory(variantPublicId, payload);
    },
    onSuccess: async (updated) => {
      toast.success(
        `Reserve updated — now ${updated.quantity_reserved} reserved`,
      );
      setChangeValue("");
      setReason("");
      await invalidate();
      onOpenChange(false);
    },
    onError: async (error: ApiError) => {
      toast.error(error.message || "Could not change the reserve.");
      await invalidate();
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage reserve</DialogTitle>
          <DialogDescription>
            {title ?? "Variant"}{" "}
            {record ? `· ${record.sku}` : null}
          </DialogDescription>
        </DialogHeader>

        {recordQuery.isPending ? (
          <div className="flex flex-col gap-3 py-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recordQuery.isError ? (
          (recordQuery.error as unknown as ApiError).status === 404 ? (
            <p role="alert" className="text-sm text-muted-foreground">
              This variant has no inventory record yet. Create its stock first
              from the Inventory page (&quot;Create record&quot; for variants
              without inventory).
            </p>
          ) : (
            <ErrorState
              error={recordQuery.error as unknown as ApiError}
              onRetry={() => void recordQuery.refetch()}
            />
          )
        ) : record ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-semibold tabular-nums">
                {record.quantity_reserved} reserved
              </span>
              <span className="text-muted-foreground">
                · available {record.quantity_available} · on hand{" "}
                {record.quantity_on_hand}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reserve-change">Signed change (+/−)</Label>
              <Input
                id="reserve-change"
                inputMode="numeric"
                value={changeValue}
                placeholder={`e.g. +${Math.max(maxReserve, 1)} or -${maxRelease || 1}`}
                autoComplete="off"
                disabled={mutation.isPending}
                onChange={(e) => setChangeValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Positive holds units aside; negative releases them. Zero is not
                allowed. Max +{maxReserve} / −{maxRelease}.
              </p>
            </div>

            <p
              className={cn(
                "text-sm",
                overReserve || overRelease
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              Result: {record.quantity_reserved} →{" "}
              {nextReserved === null ? "—" : nextReserved} reserved ·{" "}
              {nextAvailable === null ? "—" : nextAvailable} available
              {overReserve ? " — cannot reserve more than is available" : ""}
              {overRelease ? " — cannot release more than is reserved" : ""}
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reserve-reason">Reason (audit only)</Label>
              <Textarea
                id="reserve-reason"
                rows={2}
                value={reason}
                maxLength={255}
                placeholder="Optional note stored in the audit log"
                disabled={mutation.isPending}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground">
                {reason.length}/255
              </p>
            </div>

            {invalid && parsedChange === 0 ? (
              <p role="alert" className="text-sm text-destructive">
                Change must be a non-zero signed amount.
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={invalid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Applying…" : "Apply change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
