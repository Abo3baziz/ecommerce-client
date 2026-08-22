"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Separator,
} from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import type { OrderItem } from "@/types/orders";
import type { AdminOrderDetail } from "@/types/orders";
import { formatDateTime } from "@/lib/format";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function AddressCard({ order }: { order: AdminOrderDetail }) {
  const address = order.shipping_address;
  const lines = [
    address.address_1,
    address.address_2,
    [address.city, address.state, address.postal_code]
      .filter((part) => part !== null && part !== "")
      .join(", "),
    address.country,
  ].filter((line) => line !== "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping address</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <p className="font-medium">{address.recipient_name}</p>
        <p className="text-muted-foreground">{address.phone_number}</p>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </CardContent>
    </Card>
  );
}

function PaymentCard({ order }: { order: AdminOrderDetail }) {
  const payment = order.payment;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {payment ? (
          <>
            <DetailRow label="Status">
              <StatusBadge value={payment.status} />
            </DetailRow>
            <DetailRow label="Method">
              {payment.method} · {payment.provider}
            </DetailRow>
            <DetailRow label="Reference">
              <span className="font-mono text-xs">
                {payment.transaction_reference ?? "—"}
              </span>
            </DetailRow>
            <DetailRow label="Amount">
              <Money value={payment.amount} />
            </DetailRow>
            <DetailRow label="Paid at">
              {formatDateTime(payment.paid_at)}
            </DetailRow>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No payment recorded.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ShipmentCard({ order }: { order: AdminOrderDetail }) {
  const shipment = order.shipment;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <DetailRow label="Status">
          <StatusBadge value={shipment.status} />
        </DetailRow>
        <DetailRow label="Carrier">{shipment.carrier ?? "—"}</DetailRow>
        <DetailRow label="Tracking">
          <span className="font-mono text-xs">
            {shipment.tracking_number ?? "—"}
          </span>
        </DetailRow>
        <DetailRow label="Shipped at">
          {formatDateTime(shipment.shipped_at)}
        </DetailRow>
        <DetailRow label="Delivered at">
          {formatDateTime(shipment.delivered_at)}
        </DetailRow>
      </CardContent>
    </Card>
  );
}

function ItemsTable({ items }: { items: OrderItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Variant</TableHead>
          <TableHead className="text-right">Unit price</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={`${item.variant_public_id}`}>
            <TableCell className="font-medium">{item.product_name}</TableCell>
            <TableCell>
              <p className="font-mono text-xs">{item.sku}</p>
              <p className="text-xs text-muted-foreground">
                {[item.color, item.size].filter(Boolean).join(" · ") || "—"}
              </p>
            </TableCell>
            <TableCell className="text-right">
              <Money value={item.unit_price} />
              {item.discount_percentage !== null &&
              Number(item.discount_percentage) > 0 ? (
                <span className="ml-1 text-xs text-green-700">
                  −{item.discount_percentage}%
                </span>
              ) : null}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {item.quantity}
            </TableCell>
            <TableCell className="text-right">
              <Money value={item.total_amount} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TotalsCard({ order }: { order: AdminOrderDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <DetailRow label="Subtotal">
          <Money value={order.subtotal} />
        </DetailRow>
        <DetailRow label="Discount">
          <Money value={order.discount_amount} />
        </DetailRow>
        <DetailRow label="Shipping">
          <Money value={order.shipping_fee} />
        </DetailRow>
        <DetailRow label="Tax">
          <Money value={order.tax_amount} />
        </DetailRow>
        <Separator />
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Total</span>
          <Money value={order.total_amount} className="text-base" />
        </div>
      </CardContent>
    </Card>
  );
}

export function OrderDetailView({ order }: { order: AdminOrderDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <DetailRow label="Name">
              {order.customer_name}
            </DetailRow>
            <DetailRow label="Public ID">
              <span className="font-mono text-xs">
                {order.customer_public_id}
              </span>
            </DetailRow>
            <DetailRow label="Email">{order.customer_email}</DetailRow>
            <DetailRow label="Phone">{order.customer_phone_number}</DetailRow>
          </CardContent>
        </Card>
        <AddressCard order={order} />
        <ShipmentCard order={order} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemsTable items={order.items} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PaymentCard order={order} />
        <TotalsCard order={order} />
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">
              {order.notes ?? "No notes were left on this order."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
