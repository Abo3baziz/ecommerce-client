"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/queryKeys";
import { getCart } from "./api";
import { useSession } from "@/features/auth/session-context";

export function useCart() {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.cart,
    queryFn: getCart,
    enabled: user !== null,
    staleTime: 15_000,
  });
}

export function useCartSummary() {
  const { data, ...rest } = useCart();
  return { cart: data ?? null, ...rest };
}
