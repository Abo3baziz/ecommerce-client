"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { qk } from "@/lib/api/queryKeys";
import { adjustAdminInventory } from "@/features/admin/inventory-api";
import type { InventoryRecord } from "@/types/inventory";
import type { ApiError } from "@/types/envelopes";

type AdjustMode = "set" | "delta";

const SET_PATTERN = /^\d+$/;
const DELTA_PATTERN = /^[+-]?\d+$/;
const UNSIGNED_INT_PATTERN = /^\d+$/;

interface AdjustInventoryDialogProps {
  record: InventoryRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustInventoryDialog({
  record,
  open,
  onOpenChange,
}: AdjustInventoryDialogProps) {
  if (!open) return null;
  return (
    <AdjustInventoryDialogInner
      key={record.public_id}
      record={record}
      onOpenChange={onOpenChange}
    />
  );
}

function AdjustInventoryDialogInner({
  record,
  onOpenChange,
}: {
  record: InventoryRecord;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AdjustMode>("set");
  const [setValue, setSetValue] = useState("");
  const [deltaValue, setDeltaValue] = useState("");
  const [reorderValue, setReorderValue] = useState(
    record.reorder_level === null ? "" : String(record.reorder_level),
  );
  const [clearReorder, setClearReorder] = useState(false);
  const [reason, setReason] = useState("");

  const parsedSet = SET_PATTERN.test(setValue) ? Number(setValue) : null;
  const parsedDelta =
    DELTA_PATTERN.test(deltaValue.trim()) && deltaValue.trim() !== ""
      ? Number(deltaValue)
      : null;

  const computedResult: number | null =
    mode === "set"
      ? parsedSet
      : parsedDelta === null
        ? null
        : record.quantity_on_hand + parsedDelta;

  const quantityInvalid = computedResult === null || computedResult < 0;
  const negativeOutcome = computedResult !== null && computedResult < 0;
  const deltaZero = mode === "delta" && parsedDelta === 0;

  const reorderTrimmed = reorderValue.trim();
  const reorderInvalid =
    !clearReorder &&
    reorderTrimmed !== "" &&
    !UNSIGNED_INT_PATTERN.test(reorderTrimmed);
  const canSubmit =
    !quantityInvalid && !deltaZero && !reorderInvalid && reason.length <= 255;

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof adjustAdminInventory>[1] =
        mode === "set"
          ? { quantity_on_hand: computedResult ?? 0 }
          : { quantity_change: parsedDelta ?? 0 };
      if (clearReorder) {
        payload.reorder_level = null;
      } else if (reorderTrimmed !== "") {
        payload.reorder_level = Number(reorderTrimmed);
      }
      if (reason.trim() !== "") {
        payload.reason = reason.trim();
      }
      return adjustAdminInventory(record.public_id, payload);
    },
    onSuccess: async () => {
      toast.success("Stock adjusted");
      await queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      await queryClient.invalidateQueries({
        queryKey: qk.admin.inventoryRecord(record.public_id),
      });
      onOpenChange(false);
    },
    onError: async (error: ApiError) => {
      toast.error(error.message || "Could not adjust stock.");
      await queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {record.product_name} · {record.sku}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current on hand:</span>
            <span className="font-semibold tabular-nums">
              {record.quantity_on_hand}
            </span>
            <span className="text-muted-foreground">
              · available {record.quantity_available} · reserved{" "}
              {record.quantity_reserved}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Adjustment mode</Label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Adjustment mode">
              <Button
                type="button"
                variant={mode === "set" ? "default" : "outline"}
                onClick={() => setMode("set")}
                aria-pressed={mode === "set"}
              >
                Set absolute
              </Button>
              <Button
                type="button"
                variant={mode === "delta" ? "default" : "outline"}
                onClick={() => setMode("delta")}
                aria-pressed={mode === "delta"}
              >
                Signed delta
              </Button>
            </div>
          </div>

          {mode === "set" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="adjust-set">New on-hand quantity</Label>
              <Input
                id="adjust-set"
                inputMode="numeric"
                value={setValue}
                placeholder="e.g. 25"
                autoComplete="off"
                disabled={mutation.isPending}
                onChange={(e) => setSetValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Replaces the on-hand quantity entirely.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="adjust-delta">Signed change (+/−)</Label>
              <Input
                id="adjust-delta"
                inputMode="numeric"
                value={deltaValue}
                placeholder="e.g. -3 or +10"
                autoComplete="off"
                disabled={mutation.isPending}
                onChange={(e) => setDeltaValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Applied on top of the current quantity. Zero is not allowed.
              </p>
            </div>
          )}

          <p
            className={
              negativeOutcome
                ? "text-sm font-medium text-destructive"
                : "text-sm text-muted-foreground"
            }
            aria-live="polite"
          >
            Result: {record.quantity_on_hand} →{" "}
            {computedResult === null ? "—" : computedResult}
            {negativeOutcome ? " — cannot go below zero" : ""}
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adjust-reorder">Reorder level</Label>
            <Input
              id="adjust-reorder"
              inputMode="numeric"
              value={clearReorder ? "" : reorderValue}
              placeholder="Leave blank to keep unchanged"
              autoComplete="off"
              disabled={clearReorder || mutation.isPending}
              onChange={(e) => setReorderValue(e.target.value)}
            />
            {reorderInvalid ? (
              <p className="text-sm text-destructive">
                Enter a whole number ≥ 0.
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <Switch
                id="adjust-reorder-clear"
                checked={clearReorder}
                onCheckedChange={setClearReorder}
              />
              <Label
                htmlFor="adjust-reorder-clear"
                className="text-sm font-normal"
              >
                Clear reorder level
              </Label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="adjust-reason">Reason (audit only)</Label>
            <Textarea
              id="adjust-reason"
              rows={2}
              value={reason}
              maxLength={255}
              placeholder="Optional note stored in the audit log"
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground">
              {reason.length}/255
            </p>
          </div>

          {!canSubmit && (quantityInvalid || deltaZero) ? (
            <p role="alert" className="text-sm text-destructive">
              {negativeOutcome
                ? "This adjustment would drive stock below zero."
                : deltaZero
                  ? "Delta must be a non-zero signed amount."
                  : "Enter a valid quantity to continue."}
            </p>
          ) : null}
        </div>

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
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Applying…" : "Apply adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
