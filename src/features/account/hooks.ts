"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/queryKeys";
import { useSession } from "@/features/auth/session-context";
import { listSessions } from "@/features/auth/api";
import { getProfile, listAddresses, listMyReviews } from "./api";
import type { AddressListPage } from "./api";

export function useProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.me,
    queryFn: getProfile,
    enabled: user !== null,
    staleTime: 30_000,
  });
}

export const ADDRESS_PAGE_SIZE = 50;
export const MY_REVIEWS_PAGE_SIZE = 10;

export function useAddresses(page: number) {
  const { user } = useSession();
  return useQuery<AddressListPage>({
    queryKey: qk.addresses({ page, limit: ADDRESS_PAGE_SIZE }),
    queryFn: () => listAddresses({ page, limit: ADDRESS_PAGE_SIZE }),
    enabled: user !== null,
    staleTime: 15_000,
  });
}

export function useMyReviews(page: number) {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.myReviews({ page, limit: MY_REVIEWS_PAGE_SIZE }),
    queryFn: () => listMyReviews({ page, limit: MY_REVIEWS_PAGE_SIZE }),
    enabled: user !== null,
    staleTime: 15_000,
  });
}

export function useSessions() {
  const { user } = useSession();
  return useQuery({
    queryKey: qk.sessions,
    queryFn: listSessions,
    enabled: user !== null,
    staleTime: 15_000,
  });
}
