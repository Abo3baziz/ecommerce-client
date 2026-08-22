"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/components/guards";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { normalizeApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useOrder } from "@/features/orders/hooks";
import {
  OrderDetailsSkeleton,
  OrderDetailsView,
} from "@/features/orders/components/order-details-view";

function PlacedBanner({ orderNumber }: { orderNumber: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-green-600/30 bg-green-500/10 px-4 py-3"
    >
      <CheckCircle2 aria-hidden className="size-5 shrink-0 text-green-600" />
      <div className="text-sm">
        <p className="font-medium text-green-800 dark:text-green-300">
          Thank you — order {orderNumber} is confirmed.
        </p>
        <p className="text-muted-foreground">
          A confirmation email is on its way. You can follow the status below.
        </p>
      </div>
    </div>
  );
}

function OrderDetailView() {
  const params = useParams<{ orderId: string | string[] }>();
  const rawId = params.orderId;
  const orderId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
        ? (rawId[0] ?? "")
        : "";

  const searchParams = useSearchParams();
  const justPlaced = searchParams.get("placed") === "1";

  const orderQuery = useOrder(orderId);

  if (!orderId || orderQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <OrderDetailsSkeleton />
      </div>
    );
  }

  if (orderQuery.isError) {
    const status = normalizeApiError(orderQuery.error).status;
    if (status === 404 || status === 400) {
      return (
        <EmptyState
          icon={PackageSearch}
          title="Order not found"
          description="This order doesn't exist or you don't have access to it."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/orders">Back to your orders</Link>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        error={orderQuery.error}
        onRetry={() => void orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="self-start text-muted-foreground"
      >
        <Link href="/orders">
          <ArrowLeft aria-hidden className="size-4" />
          All orders
        </Link>
      </Button>

      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-mono text-xl font-semibold tracking-tight sm:text-2xl">
          {order.order_number}
        </h1>
        {justPlaced ? null : (
          <p className="text-sm text-muted-foreground">
            Placed {formatDateTime(order.placed_at)}
          </p>
        )}
      </header>

      {justPlaced ? <PlacedBanner orderNumber={order.order_number} /> : null}

      <OrderDetailsView order={order} />
    </div>
  );
}

function OrderDetailContent() {
  return (
    <AuthGate>
      <OrderDetailView />
    </AuthGate>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<OrderDetailsSkeleton />}>
      <OrderDetailContent />
    </Suspense>
  );
}
