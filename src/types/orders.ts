import type { IsoDateTime, Money, PublicId } from "./envelopes";
import type {
  OrderStatus,
  PaymentMethodV1,
  PaymentStatus,
} from "./enums";
import type { ProductId, VariantId } from "./catalog";
import type { AddressId, UserId } from "./users";

export type OrderId = PublicId<"ord_">;
export type PaymentId = PublicId<"pay_">;
export type ShipmentId = PublicId<"shp_">;

export interface ShippingAddressSnapshot {
  recipient_name: string;
  phone_number: string;
  country: string;
  state: string | null;
  city: string;
  address_1: string;
  address_2: string | null;
  postal_code: string | null;
}

export interface OrderPayment {
  public_id: PaymentId;
  status: PaymentStatus;
  method: PaymentMethodV1 | string;
  provider: string;
  transaction_reference: string | null;
  amount: Money;
  paid_at: IsoDateTime | null;
}

export interface OrderItem {
  product_public_id: ProductId;
  variant_public_id: VariantId;
  product_name: string;
  product_slug: string;
  sku: string;
  color: string | null;
  size: string | null;
  unit_price: Money;
  discount_percentage: Money | null;
  quantity: number;
  total_amount: Money;
  created_at: IsoDateTime;
}

export interface OrderShipment {
  public_id: ShipmentId;
  status: string;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: IsoDateTime | null;
  delivered_at: IsoDateTime | null;
}

export interface Order {
  public_id: OrderId;
  order_number: string;
  status: OrderStatus;
  placed_at: IsoDateTime;
  subtotal: Money;
  discount_amount: Money;
  shipping_fee: Money;
  tax_amount: Money;
  total_amount: Money;
  notes: string | null;
  shipping_address: ShippingAddressSnapshot;
  payment: OrderPayment | null;
  items: OrderItem[];
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface AdminOrderListRow extends Order {
  customer_public_id: UserId;
  customer_name: string;
  customer_email: string;
}

export interface AdminOrderDetail extends AdminOrderListRow {
  shipment: OrderShipment;
  customer_phone_number: string;
}

export interface CreateOrderInput {
  address_public_id: AddressId;
  payment_method: PaymentMethodV1;
  coupon_code?: string;
  notes?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  carrier?: string;
  tracking_number?: string;
}

export interface CustomerOrderListParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  sort?: "placed_at" | "order_number" | "total_amount";
  desc?: boolean;
}

export interface AdminOrderListParams
  extends Omit<CustomerOrderListParams, "sort"> {
  search?: string;
  placed_from?: string;
  placed_to?: string;
  sort?:
    | "placed_at"
    | "order_number"
    | "total_amount"
    | "customer_name";
}
