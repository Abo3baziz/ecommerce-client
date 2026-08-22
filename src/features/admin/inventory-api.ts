import { apiRequest } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type {
  AdjustInventoryInput,
  CreateInventoryInput,
  InventoryListParams,
  InventoryRecord,
  Paginated,
  ReserveInventoryInput,
} from "@/types";

export async function listAdminInventory(
  params: InventoryListParams = {},
): Promise<Paginated<InventoryRecord>> {
  return apiRequest<Paginated<InventoryRecord>>({
    url: "/admin/inventory",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      stock_status: params.stock_status || undefined,
      include_deleted: params.include_deleted ? true : undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "last_stock_update", desc: true },
      ),
    },
  });
}

export async function createAdminInventoryRecord(
  input: CreateInventoryInput,
): Promise<InventoryRecord> {
  return apiRequest<InventoryRecord>({
    url: "/admin/inventory",
    method: "POST",
    data: input,
  });
}

export async function getAdminInventory(
  variantId: string,
): Promise<InventoryRecord> {
  return apiRequest<InventoryRecord>({
    url: `/admin/inventory/${variantId}`,
  });
}

export async function adjustAdminInventory(
  variantId: string,
  input: AdjustInventoryInput,
): Promise<InventoryRecord> {
  return apiRequest<InventoryRecord>({
    url: `/admin/inventory/${variantId}`,
    method: "PATCH",
    data: input,
  });
}

export async function reserveAdminInventory(
  variantId: string,
  input: ReserveInventoryInput,
): Promise<InventoryRecord> {
  return apiRequest<InventoryRecord>({
    url: `/admin/inventory/${variantId}/reserve`,
    method: "PATCH",
    data: input,
  });
}
