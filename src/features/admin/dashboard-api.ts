"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { qk } from "@/lib/api/queryKeys";
import { apiRequest } from "@/lib/api/client";
import type {
  AdminOrderListRow,
  AdminStats,
  Paginated,
  StatsPeriodPreset,
} from "@/types";
import { listAdminOrders } from "./orders-api";

export interface AdminStatsResult {
  stats: AdminStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useAdminStats(preset: StatsPeriodPreset): AdminStatsResult {
  const query = useQuery({
    queryKey: qk.admin.stats(preset),
    queryFn: () =>
      apiRequest<AdminStats>({
        url: "/admin/stats",
        params: { period: preset },
      }),
    staleTime: 60_000,
  });

  return {
    stats: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface RecentAdminOrdersResult {
  orders: AdminOrderListRow[];
  isLoading: boolean;
  isError: boolean;
}

export function useRecentAdminOrders(
  limit = 8,
): RecentAdminOrdersResult {
  const query = useQuery({
    queryKey: [...qk.admin.orders({ page: 1, limit }), "recent"],
    queryFn: () =>
      listAdminOrders({ page: 1, limit }) as Promise<
        Paginated<AdminOrderListRow>
      >,
    staleTime: 30_000,
  });

  return {
    orders: query.data?.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
  };
}

// The stats endpoint covers orders/stock/customers/reviews; product and
// category totals still come from list pagination metadata.
interface CatalogTotals {
  products: number | null;
  categories: number | null;
}

async function fetchTotal(url: string): Promise<number> {
  const page = await apiRequest<Paginated<unknown>>({
    url,
    params: { page: 1, limit: 1 },
  });
  return page.pagination?.total ?? 0;
}

export function useAdminCatalogCounts(): CatalogTotals {
  const results = useQueries({
    queries: [
      {
        queryKey: [...qk.admin.products({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/products"),
        staleTime: 60_000,
      },
      {
        queryKey: [...qk.admin.categories({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/categories"),
        staleTime: 60_000,
      },
    ],
    combine: (results) => ({
      products: results[0]?.data ?? null,
      categories: results[1]?.data ?? null,
    }),
  });
  return results;
}
