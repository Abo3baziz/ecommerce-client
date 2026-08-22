import Link from "next/link";
import {
  Check,
  CircleAlert,
  CreditCard,
  MapPin,
  PackageOpen,
  ReceiptText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import type { OrderPayment } from "@/types/orders";
import type { ShippingAddressSnapshot } from "@/types/orders";
import type { IsoDateTime, Money as MoneyString } from "@/types/envelopes";
import type { OrderStatus } from "@/types/enums";
import type { Order, OrderItem } from "@/types/orders";

const TIMELINE_PATHS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["pending"],
  confirmed: ["pending", "confirmed"],
  processing: ["pending", "confirmed", "processing"],
  shipped: ["pending", "confirmed", "processing", "shipped"],
  delivered: ["pending", "confirmed", "processing", "shipped", "delivered"],
  cancelled: ["pending", "cancelled"],
  returned: [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "returned",
  ],
  refunded: [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "returned",
    "refunded",
  ],
};

const TERMINAL_STATUSES: readonly OrderStatus[] = [
  "cancelled",
  "returned",
  "refunded",
];

const STEP_LABELS: Record<OrderStatus, string> = {
  pending: "Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

function isPositive(value: MoneyString | null | undefined): boolean {
  if (!value) return false;
  return Number(value) > 0;
}

function VariantChips({ item }: { item: OrderItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="outline" className="font-mono text-[0.7rem]">
        {item.sku}
      </Badge>
      {item.color ? (
        <Badge variant="secondary">{item.color}</Badge>
      ) : null}
      {item.size ? <Badge variant="secondary">{item.size}</Badge> : null}
    </div>
  );
}

export function OrderStatusTimeline({
  status,
  placedAt,
}: {
  status: OrderStatus;
  placedAt?: IsoDateTime;
}) {
  const path = TIMELINE_PATHS[status];
  const currentIndex = path.length - 1;
  const terminal = TERMINAL_STATUSES.includes(status);

  return (
    <ol className="flex flex-wrap items-start gap-y-4">
      {path.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const failed = current && step === "cancelled";
        return (
          <li key={step} className="flex min-w-24 flex-1 flex-col gap-1.5">
            <div className="flex items-center">
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  done &&
                    "border-primary bg-primary text-primary-foreground",
                  current &&
                    !failed &&
                    "border-primary bg-background text-primary ring-3 ring-primary/20",
                  failed && "border-destructive bg-destructive text-white",
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : failed ? (
                  <CircleAlert className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              {index < path.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mx-1 h-px flex-1",
                    done ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
            </div>
            <span
              className={cn(
                "text-xs leading-tight",
                done && "text-muted-foreground",
                current &&
                  !failed &&
                  "font-semibold text-foreground",
                failed && "font-semibold text-destructive",
              )}
            >
              {STEP_LABELS[step]}
            </span>
            {step === "pending" && placedAt ? (
              <span className="text-[0.7rem] text-muted-foreground">
                {formatDateTime(placedAt)}
              </span>
            ) : null}
          </li>
        );
      })}
      {terminal && status !== "cancelled" ? (
        <p className="w-full pt-1 text-xs text-muted-foreground">
          This order closed with status{" "}
          <span className="font-medium text-foreground">{status}</span>.
        </p>
      ) : null}
      {terminal && status === "cancelled" ? (
        <p className="w-full pt-1 text-xs text-muted-foreground">
          This order was cancelled and no further steps will occur.
        </p>
      ) : null}
    </ol>
  );
}

export function OrderItemsSnapshotTable({ items }: { items: OrderItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageOpen aria-hidden className="size-4 text-muted-foreground" />
          Items ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.variant_public_id}>
                <TableCell className="max-w-56 align-top">
                  <Link
                    href={`/products/${item.product_public_id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {item.product_name}
                  </Link>
                </TableCell>
                <TableCell className="align-top">
                  <VariantChips item={item} />
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right align-top">
                  <Money value={item.unit_price} />
                  {isPositive(item.discount_percentage) ? (
                    <span className="block text-[0.7rem] text-green-700 dark:text-green-400">
                      −{item.discount_percentage}% off
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right align-top font-medium">
                  <Money value={item.total_amount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function OrderShippingAddressCard({
  address,
}: {
  address: ShippingAddressSnapshot;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin aria-hidden className="size-4 text-muted-foreground" />
          Shipping address
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 text-sm">
        <p className="font-medium">{address.recipient_name}</p>
        <p>{address.address_1}</p>
        {address.address_2 ? <p>{address.address_2}</p> : null}
        <p>
          {address.city}
          {address.state ? `, ${address.state}` : ""}
          {address.postal_code ? ` ${address.postal_code}` : ""}
        </p>
        <p>{address.country}</p>
        <p className="text-muted-foreground">{address.phone_number}</p>
      </CardContent>
    </Card>
  );
}

export function OrderPaymentCard({
  payment,
}: {
  payment: OrderPayment | null;
}) {
  if (!payment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard aria-hidden className="size-4 text-muted-foreground" />
            Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No payment has been recorded for this order yet.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard aria-hidden className="size-4 text-muted-foreground" />
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <SnapshotRow label="Provider" value={payment.provider} />
        <SnapshotRow label="Method" value={payment.method} />
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge value={payment.status} />
        </div>
        <SnapshotRow
          label="Reference"
          value={payment.transaction_reference ?? "—"}
        />
        <Separator />
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Amount</span>
          <Money
            value={payment.amount}
            className="font-medium"
          />
        </div>
        <SnapshotRow label="Paid at" value={formatDateTime(payment.paid_at)} />
      </CardContent>
    </Card>
  );
}

export function OrderTotalsCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptText aria-hidden className="size-4 text-muted-foreground" />
          Totals
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <TotalsLine label="Subtotal" amount={order.subtotal} />
        {isPositive(order.discount_amount) ? (
          <TotalsLine
            label="Discount"
            amount={order.discount_amount}
          />
        ) : null}
        {isPositive(order.shipping_fee) ? (
          <TotalsLine label="Shipping" amount={order.shipping_fee} />
        ) : null}
        {isPositive(order.tax_amount) ? (
          <TotalsLine label="Tax" amount={order.tax_amount} />
        ) : null}
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">Total</span>
          <Money
            value={order.total_amount}
            className="text-lg font-bold tracking-tight"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function TotalsLine({ label, amount }: { label: string; amount: MoneyString }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Money value={amount} className="font-medium" />
    </div>
  );
}

export function OrderNotesBlock({ notes }: { notes: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {notes ? (
          <p className="whitespace-pre-wrap text-sm">{notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No notes provided.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderDetailsView({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-6">
      <OrderStatusTimeline status={order.status} placedAt={order.placed_at} />
      <OrderItemsSnapshotTable items={order.items} />
      <div className="grid gap-6 md:grid-cols-2">
        <OrderShippingAddressCard address={order.shipping_address} />
        <OrderPaymentCard payment={order.payment} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <OrderTotalsCard order={order} />
        <OrderNotesBlock notes={order.notes} />
      </div>
    </div>
  );
}

export function OrderDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
}
