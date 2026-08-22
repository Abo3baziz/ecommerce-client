import type { IsoDateTime } from "./envelopes";
import type { StockStatus } from "./enums";
import type { ProductId, VariantId } from "./catalog";

export interface InventoryRecord {
  public_id: VariantId;
  product_public_id: ProductId;
  product_name: string;
  sku: string;
  barcode: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_level: number | null;
  stock_status: StockStatus;
  created_at: IsoDateTime;
  last_stock_update: IsoDateTime;
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  stock_status?: StockStatus;
  include_deleted?: boolean;
  sort?:
    | "product_name"
    | "sku"
    | "quantity_on_hand"
    | "quantity_available"
    | "last_stock_update";
  desc?: boolean;
}

export interface CreateInventoryInput {
  variant_public_id: VariantId;
  quantity_on_hand: number;
  reorder_level?: number;
}

export interface AdjustInventoryInput {
  quantity_on_hand?: number;
  quantity_change?: number;
  reorder_level?: number | null;
  reason?: string;
}

export interface ReserveInventoryInput {
  change: number;
  reason?: string;
}
