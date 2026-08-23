import type { IsoDateTime, Money, PublicId } from "./envelopes";
import type { VariantStatus } from "./enums";

export type ProductId = PublicId<"prd_">;
export type VariantId = PublicId<"var_">;
export type ProductImageId = PublicId<"pimg_">;
export type VariantImageId = PublicId<"vimg_">;
export type CategoryId = PublicId<"cat_">;

export interface Product {
  public_id: ProductId;
  slug: string;
  name: string;
  description: string | null;
  brand: string | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface CustomerVariantImage {
  public_id: VariantImageId;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

export interface CustomerProductImage {
  public_id: ProductImageId;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface CustomerVariant {
  public_id: VariantId;
  sku: string;
  color: string | null;
  size: string | null;
  price: Money;
  discount_percentage: Money | null;
  final_price: Money;
  weight: Money | null;
  images: CustomerVariantImage[];
}

export interface ProductDetail extends Product {
  variants: CustomerVariant[];
  images: CustomerProductImage[];
}

export interface AdminVariant {
  public_id: VariantId;
  product_public_id: ProductId;
  sku: string;
  barcode: string | null;
  color: string | null;
  size: string | null;
  price: Money;
  cost_price: Money | null;
  discount_percentage: Money | null;
  weight: Money | null;
  length: Money | null;
  width: Money | null;
  height: Money | null;
  status: VariantStatus | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface VariantImage {
  public_id: VariantImageId;
  product_variant_public_id: VariantId;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

export interface AdminVariantWithImages extends AdminVariant {
  images: VariantImage[];
}

export interface AdminProductImage {
  public_id: ProductImageId;
  product_public_id: ProductId;
  image_url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface AdminProductDetail extends Product {
  variants: AdminVariantWithImages[];
  images: AdminProductImage[];
}

export interface ImageKitAuthParams {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  folder?: string;
}

export interface Category {
  public_id: CategoryId;
  name: string;
  slug: string;
  description: string | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface CategoryDetail extends Category {
  product_count: number;
}

export interface AdminCategory extends Category {
  is_active: boolean;
}

export interface AdminCategoryDetail extends AdminCategory {
  product_count: number;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string;
  brand?: string;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string | null;
  brand?: string | null;
}

export interface CreateVariantInput {
  sku: string;
  barcode?: string;
  color?: string;
  size?: string;
  price: Money;
  cost_price?: Money;
  discount_percentage?: Money;
  weight?: Money;
  length?: Money;
  width?: Money;
  height?: Money;
  status?: VariantStatus;
}

export interface UpdateVariantInput
  extends Omit<
    Partial<CreateVariantInput>,
    | "barcode"
    | "color"
    | "size"
    | "cost_price"
    | "weight"
    | "length"
    | "width"
    | "height"
    | "status"
  > {
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  cost_price?: Money | null;
  weight?: Money | null;
  length?: Money | null;
  width?: Money | null;
  height?: Money | null;
  status?: VariantStatus | null;
}

export interface ProductImageInput {
  image_url: string;
  alt_text?: string;
  display_order?: number;
  is_primary?: boolean;
}

export interface ProductImageUpdateInput {
  image_url?: string;
  alt_text?: string | null;
  display_order?: number;
  is_primary?: boolean;
}

export interface VariantImageInput {
  image_url: string;
  alt_text?: string;
  display_order?: number;
}

export interface VariantImageUpdateInput {
  image_url?: string;
  alt_text?: string | null;
  display_order?: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  sort?: "name" | "created_at" | "updated_at";
  desc?: boolean;
}

export interface AdminProductListParams extends ProductListParams {
  include_deleted?: boolean;
}

export interface AdminVariantListParams {
  page?: number;
  limit?: number;
  status?: VariantStatus;
  include_deleted?: boolean;
  sort?: "sku" | "price" | "created_at" | "updated_at";
  desc?: boolean;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "name" | "created_at" | "updated_at";
  desc?: boolean;
}

export interface AdminCategoryListParams extends CategoryListParams {
  is_active?: boolean;
  include_deleted?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
}
