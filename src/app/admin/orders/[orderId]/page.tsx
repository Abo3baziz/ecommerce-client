"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { qk } from "@/lib/api/queryKeys";
import type { AdminOrderDetail } from "@/types/orders";
import { getAdminOrder } from "@/features/admin/orders-api";
import { OrderDetailView } from "@/features/admin/order-components/order-detail-view";
import { OrderStatusActions } from "@/features/admin/order-components/order-status-actions";
import { formatDateTime } from "@/lib/format";

function OrderSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function OrderDetail({ orderId }: { orderId: string }) {
  const query = useQuery({
    queryKey: qk.admin.order(orderId),
    queryFn: () => getAdminOrder(orderId),
  });

  if (query.isPending) {
    return <OrderSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
        className="mt-10"
      />
    );
  }

  const order: AdminOrderDetail = query.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {order.order_number}
          </h1>
          <StatusBadge value={order.status} />
          <span className="text-sm text-muted-foreground">
            Placed {formatDateTime(order.placed_at)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {order.public_id}
          </span>
        </div>
      </div>

      <OrderStatusActions order={order} />
      <OrderDetailView order={order} />
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<OrderSkeleton />}>
        <OrderDetail orderId={orderId} />
      </Suspense>
    </div>
  );
}
