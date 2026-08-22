"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/shared/money";
import { updateCartItem } from "@/features/cart/api";
import type { Cart, CartLineItem } from "@/types/cart";
import { qk } from "@/lib/api/queryKeys";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;
const QUANTITY_DEBOUNCE_MS = 500;

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, value));
}

interface CartLineItemRowProps {
  item: CartLineItem;
  onRemove: (item: CartLineItem) => void;
}

export function CartLineItemRow({ item, onRemove }: CartLineItemRowProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const updateMutation = useMutation({
    mutationFn: (input: { variantId: string; quantity: number }) =>
      updateCartItem(input.variantId, { quantity: input.quantity }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: qk.cart });
      const previous = queryClient.getQueryData<Cart>(qk.cart);
      queryClient.setQueryData<Cart | null>(qk.cart, (current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          items: current.items.map((line) =>
            line.variant_public_id === input.variantId
              ? { ...line, quantity: input.quantity }
              : line,
          ),
        };
      });
      return { previous };
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(qk.cart, cart);
      setDraft(null);
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(qk.cart, context.previous);
      } else {
        void queryClient.invalidateQueries({ queryKey: qk.cart });
      }
      setDraft(null);
      toast.error(
        "Could not update that quantity. It may exceed the available stock.",
      );
    },
  });

  function clearPendingTimer() {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function scheduleUpdate(nextQuantity: number) {
    clearPendingTimer();
    const clamped = clampQuantity(nextQuantity);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (clamped !== item.quantity) {
        updateMutation.mutate({
          variantId: item.variant_public_id,
          quantity: clamped,
        });
      } else {
        setDraft(null);
      }
    }, QUANTITY_DEBOUNCE_MS);
  }

  function handleStep(delta: number) {
    const parsed = Number.parseInt(draft ?? String(item.quantity), 10);
    const next = clampQuantity(
      (Number.isFinite(parsed) ? parsed : MIN_QUANTITY) + delta,
    );
    setDraft(String(next));
    scheduleUpdate(next);
  }

  function handleInputChange(raw: string) {
    const digitsOnly = raw.replace(/\D/g, "").slice(0, 3);
    setDraft(digitsOnly);
    const parsed = Number.parseInt(digitsOnly, 10);
    if (digitsOnly !== "" && Number.isFinite(parsed)) {
      scheduleUpdate(clampQuantity(parsed));
    }
  }

  function handleInputBlur() {
    if (draft === null) {
      return;
    }
    clearPendingTimer();
    const parsed = Number.parseInt(draft, 10);
    const next = clampQuantity(Number.isFinite(parsed) ? parsed : MIN_QUANTITY);
    setDraft(null);
    if (next !== item.quantity && !updateMutation.isPending) {
      updateMutation.mutate({
        variantId: item.variant_public_id,
        quantity: next,
      });
    }
  }

  const hasDiscount =
    item.discount_percentage !== null &&
    item.discount_percentage !== undefined &&
    Number(item.discount_percentage) > 0;

  const displayedQuantity = draft ?? String(item.quantity);

  return (
    <li className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <Package aria-hidden className="size-8 text-muted-foreground/50" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${item.product_public_id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {item.product_name}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-[0.7rem]">
            {item.sku}
          </Badge>
          {item.color ? <Badge variant="secondary">{item.color}</Badge> : null}
          {item.size ? <Badge variant="secondary">{item.size}</Badge> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-2 text-sm">
          <Money value={item.final_price} className="font-medium" />
          {hasDiscount ? (
            <>
              <Money
                value={item.price}
                className="text-muted-foreground line-through"
              />
              <span className="text-xs text-green-700 dark:text-green-400">
                −{item.discount_percentage}% applied
              </span>
            </>
          ) : null}
          <span className="text-muted-foreground">each</span>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5"
        role="group"
        aria-label={`Quantity for ${item.product_name}`}
      >
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Decrease quantity"
          disabled={
            displayedQuantity === String(MIN_QUANTITY) && draft === null
          }
          onClick={() => handleStep(-1)}
        >
          <Minus aria-hidden className="size-3.5" />
        </Button>
        <Input
          inputMode="numeric"
          aria-label="Set quantity"
          className="w-14 text-center"
          value={displayedQuantity}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={handleInputBlur}
        />
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Increase quantity"
          onClick={() => handleStep(1)}
        >
          <Plus aria-hidden className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <Money
          value={item.line_total}
          className="text-base font-semibold tracking-tight"
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRemove(item)}
        >
          <Trash2 aria-hidden className="size-4" />
          Remove
        </Button>
      </div>
    </li>
  );
}
