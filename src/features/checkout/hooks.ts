"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/queryKeys";
import { useSession } from "@/features/auth/session-context";
import { listCheckoutAddresses } from "@/features/orders/address-api";

export function useCheckoutAddresses() {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.addresses({ page: 1, limit: 100 }),
    queryFn: listCheckoutAddresses,
    enabled: user !== null,
    staleTime: 15_000,
    select: (page) => page.data,
  });
}
