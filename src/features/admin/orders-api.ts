import { apiRequest } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type {
  AdminOrderDetail,
  AdminOrderListParams,
  AdminOrderListRow,
  Paginated,
  UpdateOrderStatusInput,
} from "@/types";

function toIsoBound(value: string | undefined, endOfDay: boolean) {
  if (!value || value === "") return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
  }
  return value;
}

export async function listAdminOrders(
  params: AdminOrderListParams = {},
): Promise<Paginated<AdminOrderListRow>> {
  return apiRequest<Paginated<AdminOrderListRow>>({
    url: "/admin/orders",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status || undefined,
      search: params.search || undefined,
      placed_from: toIsoBound(params.placed_from, false),
      placed_to: toIsoBound(params.placed_to, true),
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "placed_at", desc: true },
      ),
    },
  });
}

export async function getAdminOrder(
  orderId: string,
): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>({
    url: `/admin/orders/${orderId}`,
  });
}

export async function updateAdminOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput,
): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>({
    url: `/admin/orders/${orderId}`,
    method: "PATCH",
    data: input,
  });
}
