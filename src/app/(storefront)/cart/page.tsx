"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/components/guards";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { clearCart, removeCartItem } from "@/features/cart/api";
import { useCartSummary } from "@/features/cart/hooks";
import { CartLineItemRow } from "@/features/cart/components/cart-line-item";
import { qk } from "@/lib/api/queryKeys";
import type { CartLineItem } from "@/types/cart";

function StatsBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-5 w-16" />
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Card>
        <CardContent className="flex items-center justify-between gap-6">
          <StatsBlock label="Distinct items" />
          <StatsBlock label="Total quantity" />
          <StatsBlock label="Subtotal" />
        </CardContent>
      </Card>
      {[0, 1].map((index) => (
        <Skeleton key={index} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

function CartContent() {
  const queryClient = useQueryClient();
  const cartQuery = useCartSummary();
  const [removalTarget, setRemovalTarget] = useState<CartLineItem | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const removeMutation = useMutation({
    mutationFn: (variantId: string) => removeCartItem(variantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cart });
      toast.success("Item removed from your cart.");
    },
    onError: (error: unknown) => {
      const err = error as { message?: string };
      toast.error(err.message || "Could not remove that item. Try again.");
      void queryClient.invalidateQueries({ queryKey: qk.cart });
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      queryClient.setQueryData(qk.cart, null);
      toast.success("Your cart has been cleared.");
    },
    onError: (error: unknown) => {
      const err = error as { message?: string };
      toast.error(err.message || "Could not clear your cart. Try again.");
    },
  });

  if (cartQuery.isPending) {
    return <CartSkeleton />;
  }

  if (cartQuery.isError) {
    return (
      <ErrorState
        error={cartQuery.error}
        onRetry={() => void cartQuery.refetch()}
      />
    );
  }

  const cart = cartQuery.cart;
  const lines = cart?.items ?? [];
  const isEmpty = !cart || lines.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        </header>
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse the catalog and add something you love."
          action={
            <Button size="sm" asChild>
              <Link href="/products">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={clearMutation.isPending}
          onClick={() => setClearOpen(true)}
        >
          <Trash2 aria-hidden className="size-4" />
          Clear cart
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-lg font-semibold tabular-nums">
              {cart.items_count}
            </span>
            <span className="text-xs text-muted-foreground">
              Distinct items
            </span>
          </div>
          <Separator orientation="vertical" className="hidden h-8 sm:block" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tabular-nums">
              {cart.total_quantity}
            </span>
            <span className="text-xs text-muted-foreground">
              Total quantity
            </span>
          </div>
          <Separator orientation="vertical" className="hidden h-8 sm:block" />
          <div className="flex flex-col">
            <Money
              value={cart.subtotal}
              className="text-lg font-semibold tracking-tight"
            />
            <span className="text-xs text-muted-foreground">Subtotal</span>
          </div>
        </CardContent>
      </Card>

      <ul className="flex flex-col gap-3">
        {lines.map((item) => (
          <CartLineItemRow
            key={item.variant_public_id}
            item={item}
            onRemove={setRemovalTarget}
          />
        ))}
      </ul>

      <div className="flex justify-end">
        <Button size="lg" asChild>
          <Link href="/checkout">
            Proceed to checkout
            <ArrowRight data-icon="inline-end" aria-hidden className="size-4" />
          </Link>
        </Button>
      </div>

      <ConfirmDialog
        open={removalTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemovalTarget(null);
          }
        }}
        destructive
        title="Remove this item?"
        description={
          removalTarget
            ? `"${removalTarget.product_name}" will be removed from your cart.`
            : undefined
        }
        confirmLabel="Remove item"
        onConfirm={() => {
          if (!removalTarget) {
            return;
          }
          return removeMutation
            .mutateAsync(removalTarget.variant_public_id)
            .catch(() => undefined);
        }}
      />

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        destructive
        title="Clear your entire cart?"
        description="All items will be removed. This cannot be undone."
        confirmLabel="Clear cart"
        onConfirm={() => clearMutation.mutateAsync().catch(() => undefined)}
      />
    </div>
  );
}

export default function CartPage() {
  return (
    <AuthGate>
      <CartContent />
    </AuthGate>
  );
}
