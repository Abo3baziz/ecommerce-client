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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { qk } from "@/lib/api/queryKeys";
import { legalTransitions } from "@/types/enums";
import type { OrderStatus } from "@/types/enums";
import type { AdminOrderDetail } from "@/types/orders";
import type { ApiError } from "@/types/envelopes";
import { updateAdminOrderStatus } from "@/features/admin/orders-api";

const TRANSITION_LABELS: Record<OrderStatus, string> = {
  pending: "Mark as pending",
  confirmed: "Confirm order",
  processing: "Start processing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
  returned: "Mark as returned",
  refunded: "Record refund",
};

const SIDE_EFFECTS: Partial<Record<OrderStatus, string>> = {
  cancelled:
    "Cancelling this order releases its reserved stock back to inventory and cannot be undone.",
  returned:
    "Marking this order as returned releases its reserved stock back to inventory.",
  refunded:
    "A refund will be recorded server-side for this order. Make sure payment has been settled.",
};

function ShipDialog({
  order,
  open,
  onOpenChange,
}: {
  order: AdminOrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function invalidateAfterTransition() {
    await queryClient.invalidateQueries({
      queryKey: qk.admin.order(order.public_id),
    });
    await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  const shipMutation = useMutation({
    mutationFn: () => {
      const trimmedCarrier = carrier.trim();
      const input: Parameters<typeof updateAdminOrderStatus>[1] = {
        status: "shipped",
        carrier: trimmedCarrier,
      };
      const tracking = trackingNumber.trim();
      if (tracking !== "") {
        input.tracking_number = tracking;
      }
      return updateAdminOrderStatus(order.public_id, input);
    },
    onSuccess: async () => {
      toast.success("Order marked as shipped");
      await invalidateAfterTransition();
      onOpenChange(false);
    },
    onError: async (apiError: ApiError) => {
      if (apiError.status === 409) {
        toast.error(
          apiError.message ||
            "This transition is no longer valid — refreshing the order.",
        );
        await invalidateAfterTransition();
        onOpenChange(false);
        return;
      }
      setError(apiError.message || "Could not mark the order as shipped.");
    },
  });

  function submit() {
    setError(null);
    if (carrier.trim() === "") {
      setError("Carrier is required to ship an order.");
      return;
    }
    if (carrier.trim().length > 100 || trackingNumber.trim().length > 100) {
      setError("Carrier and tracking number must be at most 100 characters.");
      return;
    }
    shipMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ship {order.order_number}</DialogTitle>
          <DialogDescription>
            Carrier is required; a tracking number is optional.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ship-carrier">Carrier</Label>
            <Input
              id="ship-carrier"
              value={carrier}
              placeholder="e.g. DHL Express"
              autoComplete="off"
              onChange={(e) => setCarrier(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ship-tracking">Tracking number</Label>
            <Input
              id="ship-tracking"
              value={trackingNumber}
              placeholder="Optional"
              autoComplete="off"
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={shipMutation.isPending}
            onClick={submit}
          >
            {shipMutation.isPending ? "Shipping…" : "Confirm shipment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleTransitionConfirm({
  order,
  nextStatus,
  open,
  onOpenChange,
}: {
  order: AdminOrderDetail;
  nextStatus: OrderStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  async function confirm() {
    try {
      await updateAdminOrderStatus(order.public_id, { status: nextStatus });
      toast.success(`Order marked as ${nextStatus}`);
      await queryClient.invalidateQueries({
        queryKey: qk.admin.order(order.public_id),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 409) {
        toast.error(
          apiError.message ||
            "This transition is no longer valid — refreshing the order.",
        );
        await queryClient.invalidateQueries({
          queryKey: qk.admin.order(order.public_id),
        });
        onOpenChange(false);
        return;
      }
      toast.error(apiError.message || "Could not update the order.");
      throw error;
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${TRANSITION_LABELS[nextStatus]}?`}
      description={
        SIDE_EFFECTS[nextStatus] ??
        `This changes the order status from ${order.status} to ${nextStatus}.`
      }
      confirmLabel={TRANSITION_LABELS[nextStatus]}
      destructive={nextStatus === "cancelled" || nextStatus === "refunded"}
      onConfirm={confirm}
    />
  );
}

interface TransitionState {
  kind: "none" | "ship" | "confirm";
  status: OrderStatus;
}

export function OrderStatusActions({ order }: { order: AdminOrderDetail }) {
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const transitions = legalTransitions(order.status);

  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-sm font-medium">Status actions</h2>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        Only valid transitions are shown. Cancelled and refunded orders are terminal.
      </p>
      {transitions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This order is in a terminal state ({order.status}) — no further
          transitions are available.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {transitions.map((status) =>
            status === "shipped" ? (
              <Button
                key={status}
                size="sm"
                onClick={() => setTransition({ kind: "ship", status })}
              >
                Mark as shipped…
              </Button>
            ) : (
              <Button
                key={status}
                size="sm"
                variant={
                  status === "cancelled" || status === "refunded"
                    ? "outline"
                    : "default"
                }
                className={
                  status === "cancelled" || status === "refunded"
                    ? "text-destructive hover:text-destructive"
                    : undefined
                }
                onClick={() => setTransition({ kind: "confirm", status })}
              >
                {TRANSITION_LABELS[status]}
              </Button>
            ),
          )}
        </div>
      )}

      {transition?.kind === "ship" ? (
        <ShipDialog
          order={order}
          open
          onOpenChange={(open) => {
            if (!open) setTransition(null);
          }}
        />
      ) : null}

      {transition?.kind === "confirm" ? (
        <SimpleTransitionConfirm
          order={order}
          nextStatus={transition.status}
          open
          onOpenChange={(open) => {
            if (!open) setTransition(null);
          }}
        />
      ) : null}
    </section>
  );
}
