import type { Money, PublicId } from "./envelopes";
import type { ProductId, VariantId } from "./catalog";

export type CartId = PublicId<"crt_">;

export interface CartLineItem {
  variant_public_id: VariantId;
  product_public_id: ProductId;
  product_name: string;
  product_slug: string;
  sku: string;
  color: string | null;
  size: string | null;
  image_url: string | null;
  price: Money;
  discount_percentage: Money | null;
  final_price: Money;
  quantity: number;
  line_total: Money;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  public_id: CartId;
  items_count: number;
  total_quantity: number;
  subtotal: Money;
  items: CartLineItem[];
  created_at: string;
  updated_at: string;
}

export interface AddCartItemInput {
  variant_public_id: VariantId;
  quantity?: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}
