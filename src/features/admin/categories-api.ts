import { apiRequest } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type {
  AdminCategory,
  AdminCategoryDetail,
  AdminCategoryListParams,
  CreateCategoryInput,
  Paginated,
  Product,
  UpdateCategoryInput,
} from "@/types";

export async function listAdminCategories(
  params: AdminCategoryListParams = {},
): Promise<Paginated<AdminCategory>> {
  return apiRequest<Paginated<AdminCategory>>({
    url: "/admin/categories",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      is_active: params.is_active,
      include_deleted: params.include_deleted ? true : undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "name", desc: false },
      ),
    },
  });
}

export async function getAdminCategory(
  categoryId: string,
): Promise<AdminCategoryDetail> {
  return apiRequest<AdminCategoryDetail>({
    url: `/admin/categories/${categoryId}`,
  });
}

export async function createAdminCategory(
  input: CreateCategoryInput,
): Promise<AdminCategory> {
  return apiRequest<AdminCategory>({
    url: "/admin/categories",
    method: "POST",
    data: input,
  });
}

export async function updateAdminCategory(
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<AdminCategory> {
  return apiRequest<AdminCategory>({
    url: `/admin/categories/${categoryId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/categories/${categoryId}`,
    method: "DELETE",
  });
}

export async function listAdminCategoryProducts(
  categoryId: string,
  params: { page?: number; limit?: number } = {},
): Promise<Paginated<Product>> {
  return apiRequest<Paginated<Product>>({
    url: `/admin/categories/${categoryId}/products`,
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
  });
}

export async function assignAdminCategoryProduct(
  categoryId: string,
  productId: string,
): Promise<void> {
  await apiRequest<void>({
    url: `/admin/categories/${categoryId}/products/${productId}`,
    method: "PUT",
  });
}

export async function unassignAdminCategoryProduct(
  categoryId: string,
  productId: string,
): Promise<void> {
  await apiRequest<void>({
    url: `/admin/categories/${categoryId}/products/${productId}`,
    method: "DELETE",
  });
}
