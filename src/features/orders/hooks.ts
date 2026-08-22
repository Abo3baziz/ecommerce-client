"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/queryKeys";
import { useSession } from "@/features/auth/session-context";
import type {
  CreateOrderInput,
  CustomerOrderListParams,
} from "@/types/orders";
import { createOrder, getOrder, listOrders } from "./api";

export const ORDERS_PAGE_SIZE = 10;

export function useOrders(params: CustomerOrderListParams = {}) {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.orders(params),
    queryFn: () => listOrders({ limit: ORDERS_PAGE_SIZE, ...params }),
    enabled: user !== null,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

export function useOrder(orderId: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.order(orderId),
    queryFn: () => getOrder(orderId),
    enabled: user !== null && orderId !== "",
    staleTime: 15_000,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: qk.order(order.public_id) });
      void queryClient.invalidateQueries({ queryKey: qk.cart });
    },
  });
}
