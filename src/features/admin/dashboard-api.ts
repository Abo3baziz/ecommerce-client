"use client";

import { useQueries } from "@tanstack/react-query";
import { qk } from "@/lib/api/queryKeys";
import { apiRequest } from "@/lib/api/client";

interface TotalOnlyPage {
  pagination: {
    total: number;
  };
}

async function fetchTotal(url: string): Promise<number> {
  const page = await apiRequest<TotalOnlyPage>({
    url,
    params: { page: 1, limit: 1 },
  });
  return page.pagination?.total ?? 0;
}

export interface AdminQuickCounts {
  products: number | null;
  categories: number | null;
  inventory: number | null;
  orders: number | null;
  reviews: number | null;
  customers: number | null;
}

export interface AdminQuickCountsResult {
  counts: AdminQuickCounts;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useAdminQuickCounts(): AdminQuickCountsResult {
  const result = useQueries({
    queries: [
      {
        queryKey: [...qk.admin.products({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/products"),
      },
      {
        queryKey: [...qk.admin.categories({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/categories"),
      },
      {
        queryKey: [...qk.admin.inventory({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/inventory"),
      },
      {
        queryKey: [...qk.admin.orders({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/orders"),
      },
      {
        queryKey: [...qk.admin.reviews({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/reviews"),
      },
      {
        queryKey: [...qk.admin.users({ page: 1, limit: 1 }), "count"],
        queryFn: () => fetchTotal("/admin/users"),
      },
    ],
    combine: (results) => {
      const [products, categories, inventory, orders, reviews, users] =
        results;
      return {
        counts: {
          products: products?.data ?? null,
          categories: categories?.data ?? null,
          inventory: inventory?.data ?? null,
          orders: orders?.data ?? null,
          reviews: reviews?.data ?? null,
          customers: users?.data ?? null,
        } satisfies AdminQuickCounts,
        isLoading: results.some((r) => r.isLoading),
        isError: results.some((r) => r.isError),
        refetch: () => {
          for (const r of results) {
            void r.refetch();
          }
        },
      };
    },
  });

  return result;
}
