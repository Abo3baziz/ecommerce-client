import { apiRequest, normalizeApiError } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type {
  Category,
  CategoryDetail,
  CategoryListParams,
  Paginated,
  Product,
  ProductDetail,
  ProductListParams,
} from "@/types";

export async function listCategories(
  params: CategoryListParams = {},
): Promise<Paginated<Category>> {
  return apiRequest<Paginated<Category>>({
    url: "/categories",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      search: params.search || undefined,
      sort: sortParam(
        params.sort ? { field: params.sort, desc: params.desc } : undefined,
      ),
    },
  });
}

export async function getCategory(categoryId: string): Promise<CategoryDetail> {
  return apiRequest<CategoryDetail>({ url: `/categories/${categoryId}` });
}

export async function listCategoryProducts(
  categoryId: string,
  params: ProductListParams = {},
): Promise<Paginated<Product>> {
  return apiRequest<Paginated<Product>>({
    url: `/categories/${categoryId}/products`,
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      brand: params.brand || undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "created_at", desc: true },
      ),
    },
  });
}

export async function listProducts(
  params: ProductListParams = {},
): Promise<Paginated<Product>> {
  return apiRequest<Paginated<Product>>({
    url: "/products",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      brand: params.brand || undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "created_at", desc: true },
      ),
    },
  });
}

export async function getProduct(productId: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>({ url: `/products/${productId}` });
}

export function isProductNotFound(error: unknown): boolean {
  const err = normalizeApiError(error);
  return err.status === 404;
}
