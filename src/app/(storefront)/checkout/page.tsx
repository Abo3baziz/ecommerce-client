"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  MailCheck,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AuthGate } from "@/components/guards";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCartSummary } from "@/features/cart/hooks";
import { useSession } from "@/features/auth/session-context";
import { normalizeApiError } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { AddressId } from "@/types/users";
import type { Order } from "@/types/orders";
import type { PaymentMethodV1 } from "@/types/enums";
import { AddressStep } from "@/features/checkout/components/address-step";
import { useCheckoutAddresses } from "@/features/checkout/hooks";
import { useCreateOrder } from "@/features/orders/hooks";

const STEPS = [
  { number: 1, title: "Address" },
  { number: 2, title: "Payment" },
  { number: 3, title: "Coupon" },
  { number: 4, title: "Notes" },
] as const;

function VerifiedEmailGate() {
  return (
    <Card className="mx-auto max-w-md text-center">
      <CardHeader>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <MailCheck aria-hidden className="size-6 text-muted-foreground" />
        </div>
        <CardTitle>Verify your email to check out</CardTitle>
        <CardDescription>
          We need to confirm your email address before you can place an order.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/account/email">Verify your email</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function PlacedSuccessCard({ order }: { order: Order }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(`/orders/${order.public_id}?placed=1`);
    }, 2500);
    return () => clearTimeout(timer);
  }, [order.public_id, router]);

  return (
    <Card className="mx-auto w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-500/15">
          <Check aria-hidden className="size-7 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Order placed!</CardTitle>
        <CardDescription>Thank you — we received your order.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="font-mono text-lg font-semibold">{order.order_number}</p>
        <StatusBadge value={order.status} className="text-sm" />
        <p className="text-sm text-muted-foreground">
          Redirecting you to your order…
        </p>
        <Button variant="outline" asChild>
          <Link href={`/orders/${order.public_id}?placed=1`}>
            View order now
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface StepperHeaderProps {
  current: number;
  maxReached: number;
  onStepSelect: (step: number) => void;
}

function StepperHeader({ current, maxReached, onStepSelect }: StepperHeaderProps) {
  return (
    <ol
      className="flex flex-wrap items-center gap-x-2 gap-y-2"
      aria-label="Checkout steps"
    >
      {STEPS.map((step, index) => {
        const done = step.number < current;
        const visited = step.number <= maxReached && step.number !== current;
        const active = step.number === current;
        return (
          <li key={step.number} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!visited}
              onClick={() => onStepSelect(step.number)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors",
                active && "bg-primary font-medium text-primary-foreground",
                visited &&
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                !active && !visited && "text-muted-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[0.7rem]",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-current text-current"
                      : "border-border",
                )}
              >
                {done ? <Check className="size-3" /> : step.number}
              </span>
              {step.title}
            </button>
            {index < STEPS.length - 1 ? (
              <span aria-hidden className="h-px w-6 bg-border sm:w-10" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

interface SummaryPanelProps {
  subtotal: string;
  itemCount: number;
  addressSummary: string | null;
  couponCode: string;
}

function SummaryPanel({
  subtotal,
  itemCount,
  addressSummary,
  couponCode,
}: SummaryPanelProps) {
  return (
    <Card className="h-fit lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>Order summary</CardTitle>
        <CardDescription>
          {itemCount} item{itemCount === 1 ? "" : "s"} in your cart
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Subtotal</span>
          <Money value={subtotal} className="font-semibold tracking-tight" />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Shipping, tax, and any coupon discount are calculated by the server
          and applied once your order is confirmed — the final total appears on
          the confirmation page.
        </p>
        <div className="rounded-lg border p-3 text-xs">
          <p className="font-medium">Delivering to</p>
          <p className="mt-0.5 text-muted-foreground">
            {addressSummary ?? "No address selected yet."}
          </p>
          {couponCode.trim() !== "" ? (
            <>
              <p className="mt-2 font-medium">Coupon</p>
              <p className="mt-0.5 font-mono text-muted-foreground">
                {couponCode.trim()}
              </p>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CheckoutWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [pickedAddressId, setPickedAddressId] = useState<AddressId | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodV1>("mock");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);
  const [missingContextError, setMissingContextError] = useState<string | null>(
    null,
  );
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  const createOrderMutation = useCreateOrder();

  const cartQuery = useCartSummary();
  const addressesQuery = useCheckoutAddresses();
  const addresses = addressesQuery.data ?? [];
  const defaultCandidateId =
    addresses.find((address) => address.is_default_shipping)?.public_id ??
    addresses[0]?.public_id ??
    null;
  const addressId = pickedAddressId ?? defaultCandidateId;

  if (placedOrder) {
    return <PlacedSuccessCard order={placedOrder} />;
  }

  if (cartQuery.isPending) {
    return (
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" aria-hidden>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
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

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Your cart is empty"
        description="Add items to your cart before checking out."
        action={
          <Button size="sm" variant="outline" asChild>
            <Link href="/cart">Back to cart</Link>
          </Button>
        }
      />
    );
  }

  function goTo(next: number) {
    const bounded = Math.min(STEPS.length, Math.max(1, next));
    setStep(bounded);
    setMaxReached((current) => Math.max(current, bounded));
    setRootError(null);
  }

  async function handleRefreshContext() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["addresses"] }),
      queryClient.invalidateQueries({ queryKey: qk.cart }),
    ]);
    setMissingContextError(null);
    setStep(1);
    toast.success("Your details were refreshed.");
  }

  async function handlePlaceOrder() {
    if (!user || !addressId || createOrderMutation.isPending) {
      return;
    }
    setRootError(null);
    setMissingContextError(null);
    setStockWarning(null);
    setCouponError(null);
    try {
      const order = await createOrderMutation.mutateAsync({
        address_public_id: addressId,
        payment_method: paymentMethod,
        coupon_code: couponCode.trim() !== "" ? couponCode.trim() : undefined,
        notes: notes.trim() !== "" ? notes.trim() : undefined,
      });
      setPlacedOrder(order);
      router.refresh();
    } catch (error) {
      const err = normalizeApiError(error);
      if (err.status === 400) {
        setRootError(
          err.message ||
            "Some details look invalid. Please review your information.",
        );
      } else if (err.status === 404) {
        setMissingContextError(
          err.message ||
            "Your cart or selected address could not be found. Refresh your details and try again.",
        );
      } else if (err.status === 409) {
        const message = err.message.toLowerCase();
        if (message.includes("coupon")) {
          setCouponError(err.message);
          setStep(3);
        } else if (
          message.includes("stock") ||
          message.includes("purchasable") ||
          message.includes("empty")
        ) {
          setStockWarning(
            err.message ||
              "Your cart needs attention before this order can be placed.",
          );
        } else {
          toast.error(err.message || "Could not place your order.");
        }
      } else {
        toast.error(err.message || "Could not place your order. Try again.");
      }
    }
  }

  const canContinue = step === 1 ? addressId !== null : true;
  const placing = createOrderMutation.isPending;

  const selectedAddress = addresses.find(
    (address) => address.public_id === addressId,
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <StepperHeader
          current={step}
          maxReached={maxReached}
          onStepSelect={goTo}
        />

        {missingContextError ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          >
            <span>{missingContextError}</span>
            <span className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleRefreshContext()}
              >
                <RefreshCw aria-hidden className="size-4" />
                Refresh details
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/cart">Back to cart</Link>
              </Button>
            </span>
          </div>
        ) : null}

        {stockWarning ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <CircleAlert
                aria-hidden
                className="size-4 shrink-0 text-amber-600"
              />
              {stockWarning}
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link href="/cart">Review your cart</Link>
            </Button>
          </div>
        ) : null}

        {rootError ? (
          <p role="alert" className="text-sm text-destructive">
            {rootError}
          </p>
        ) : null}

        {step === 1 ? (
          <AddressStep
            selectedId={addressId}
            onSelect={setPickedAddressId}
          />
        ) : null}

        {step === 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>Payment method</CardTitle>
              <CardDescription>
                Choose how you would like to pay.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Payment method">
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                    paymentMethod === "mock"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-foreground/20",
                  )}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    className="mt-1 accent-primary"
                    checked={paymentMethod === "mock"}
                    onChange={() => setPaymentMethod("mock")}
                  />
                  <span className="flex flex-col gap-0.5 text-sm">
                    <span className="font-medium">Mock provider (test)</span>
                    <span className="text-muted-foreground">
                      No real charge is made — this test provider marks the
                      order as paid instantly.
                    </span>
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <CardHeader>
              <CardTitle>Coupon</CardTitle>
              <CardDescription>
                Optional — the code is validated when you place the order.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="checkout-coupon">Coupon code</Label>
              <Input
                id="checkout-coupon"
                placeholder="e.g. SAVE10"
                value={couponCode}
                aria-invalid={couponError ? true : undefined}
                onChange={(event) => setCouponCode(event.target.value)}
              />
              {couponError ? (
                <p role="alert" className="text-sm text-destructive">
                  {couponError}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card>
            <CardHeader>
              <CardTitle>Order notes</CardTitle>
              <CardDescription>
                Anything we should know about delivery (optional).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="checkout-notes">Notes</Label>
              <Textarea
                id="checkout-notes"
                rows={5}
                maxLength={1000}
                value={notes}
                placeholder="Leave at the front desk…"
                onChange={(event) => setNotes(event.target.value)}
              />
              <p className="self-end text-xs tabular-nums text-muted-foreground">
                {notes.length}/1000
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => goTo(step - 1)}
            disabled={step === 1}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden className="size-4" />
            Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={() => goTo(step + 1)} disabled={!canContinue}>
              Continue
              <ArrowRight data-icon="inline-end" aria-hidden className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void handlePlaceOrder()}
              disabled={!canContinue || placing}
            >
              {placing ? "Placing order…" : "Place order"}
              {!placing ? (
                <ArrowRight data-icon="inline-end" aria-hidden className="size-4" />
              ) : null}
            </Button>
          )}
        </div>
      </div>

      <SummaryPanel
        subtotal={cart.subtotal}
        itemCount={cart.items_count}
        addressSummary={
          selectedAddress
            ? `${selectedAddress.recipient_name}, ${selectedAddress.city}, ${selectedAddress.country}`
            : null
        }
        couponCode={couponCode}
      />
    </div>
  );
}

function CheckoutExperience() {
  const { user } = useSession();

  if (!user || !user.email_verified) {
    return <VerifiedEmailGate />;
  }
  return <CheckoutWizard />;
}

export default function CheckoutPage() {
  return (
    <AuthGate>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      </header>
      <CheckoutExperience />
    </AuthGate>
  );
}
