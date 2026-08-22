import { apiRequest } from "@/lib/api/client";
import type { Paginated } from "@/types/envelopes";
import type {
  CreateOrderInput,
  CustomerOrderListParams,
  Order,
} from "@/types/orders";

export async function listOrders(
  params: CustomerOrderListParams = {},
): Promise<Paginated<Order>> {
  const sort = params.sort
    ? `${params.desc === true ? "-" : ""}${params.sort}`
    : undefined;
  return apiRequest<Paginated<Order>>({
    url: "/orders",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      status: params.status,
      sort,
    },
  });
}

export async function getOrder(orderId: string): Promise<Order> {
  return apiRequest<Order>({ url: `/orders/${orderId}` });
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiRequest<Order>({
    url: "/orders",
    method: "POST",
    data: input,
  });
}
