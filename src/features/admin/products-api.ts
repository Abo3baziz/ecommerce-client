import { apiRequest } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type { Money, VariantStatus } from "@/types";
import type {
  AdminProductDetail,
  AdminProductImage,
  AdminProductListParams,
  AdminVariant,
  AdminVariantListParams,
  AdminVariantWithImages,
  CreateProductInput,
  CreateVariantInput,
  Paginated,
  Product,
  ProductImageId,
  ProductImageInput,
  ProductImageUpdateInput,
  UpdateProductInput,
  VariantImage,
  VariantImageId,
  VariantImageInput,
  VariantImageUpdateInput,
} from "@/types";

export interface AdminVariantPatchInput {
  sku?: string;
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  price?: Money;
  cost_price?: Money | null;
  discount_percentage?: Money | null;
  weight?: Money | null;
  length?: Money | null;
  width?: Money | null;
  height?: Money | null;
  status?: VariantStatus | null;
}

export async function listAdminProducts(
  params: AdminProductListParams = {},
): Promise<Paginated<Product>> {
  return apiRequest<Paginated<Product>>({
    url: "/admin/products",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      brand: params.brand || undefined,
      include_deleted: params.include_deleted ? true : undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "created_at", desc: true },
      ),
    },
  });
}

export async function createAdminProduct(
  input: CreateProductInput,
): Promise<Product> {
  return apiRequest<Product>({
    url: "/admin/products",
    method: "POST",
    data: input,
  });
}

export async function getAdminProduct(
  productId: string,
): Promise<AdminProductDetail> {
  return apiRequest<AdminProductDetail>({
    url: `/admin/products/${productId}`,
    params: { include_deleted_variants: true },
  });
}

export async function updateAdminProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  return apiRequest<Product>({
    url: `/admin/products/${productId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteAdminProduct(productId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/products/${productId}`,
    method: "DELETE",
  });
}

export async function listAdminVariants(
  productId: string,
  params: AdminVariantListParams = {},
): Promise<Paginated<AdminVariant>> {
  return apiRequest<Paginated<AdminVariant>>({
    url: `/admin/products/${productId}/variants`,
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status || undefined,
      include_deleted: params.include_deleted ? true : undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "created_at", desc: false },
      ),
    },
  });
}

export async function getAdminVariant(
  productId: string,
  variantId: string,
): Promise<AdminVariantWithImages> {
  return apiRequest<AdminVariantWithImages>({
    url: `/admin/products/${productId}/variants/${variantId}`,
  });
}

export async function createAdminVariant(
  productId: string,
  input: CreateVariantInput,
): Promise<AdminVariant> {
  return apiRequest<AdminVariant>({
    url: `/admin/products/${productId}/variants`,
    method: "POST",
    data: input,
  });
}

export async function updateAdminVariant(
  productId: string,
  variantId: string,
  input: AdminVariantPatchInput,
): Promise<AdminVariant> {
  return apiRequest<AdminVariant>({
    url: `/admin/products/${productId}/variants/${variantId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteAdminVariant(
  productId: string,
  variantId: string,
): Promise<void> {
  await apiRequest<void>({
    url: `/admin/products/${productId}/variants/${variantId}`,
    method: "DELETE",
  });
}

export async function listProductImages(
  productId: string,
): Promise<AdminProductImage[]> {
  return apiRequest<AdminProductImage[]>({
    url: `/admin/products/${productId}/images`,
  });
}

export async function createProductImage(
  productId: string,
  input: ProductImageInput,
): Promise<AdminProductImage> {
  return apiRequest<AdminProductImage>({
    url: `/admin/products/${productId}/images`,
    method: "POST",
    data: input,
  });
}

export async function updateProductImage(
  productId: string,
  imageId: ProductImageId | string,
  input: ProductImageUpdateInput,
): Promise<AdminProductImage> {
  return apiRequest<AdminProductImage>({
    url: `/admin/products/${productId}/images/${imageId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteProductImage(
  productId: string,
  imageId: ProductImageId | string,
): Promise<void> {
  await apiRequest<void>({
    url: `/admin/products/${productId}/images/${imageId}`,
    method: "DELETE",
  });
}

export async function listVariantImages(
  productId: string,
  variantId: string,
): Promise<VariantImage[]> {
  return apiRequest<VariantImage[]>({
    url: `/admin/products/${productId}/variants/${variantId}/images`,
  });
}

export async function createVariantImage(
  productId: string,
  variantId: string,
  input: VariantImageInput,
): Promise<VariantImage> {
  return apiRequest<VariantImage>({
    url: `/admin/products/${productId}/variants/${variantId}/images`,
    method: "POST",
    data: input,
  });
}

export async function updateVariantImage(
  productId: string,
  variantId: string,
  imageId: VariantImageId | string,
  input: VariantImageUpdateInput,
): Promise<VariantImage> {
  return apiRequest<VariantImage>({
    url: `/admin/products/${productId}/variants/${variantId}/images/${imageId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteVariantImage(
  productId: string,
  variantId: string,
  imageId: VariantImageId | string,
): Promise<void> {
  await apiRequest<void>({
    url: `/admin/products/${productId}/variants/${variantId}/images/${imageId}`,
    method: "DELETE",
  });
}
