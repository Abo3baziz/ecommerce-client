"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest } from "@/lib/api/client";
import { clearCsrfToken } from "@/lib/api/csrf";
import { qk } from "@/lib/api/queryKeys";
import { onSessionExpired } from "@/lib/api/session-events";
import { getSession, ensureCsrfToken, logout as logoutRequest } from "./api";

export interface SessionContextValue {
  user: { public_id: string; email_verified: boolean } | null;
  isLoading: boolean;
  isAdmin: boolean;
  adminProbePending: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const sessionQuery = useQuery({
    queryKey: qk.session,
    queryFn: getSession,
    staleTime: 60_000,
    retry: false,
  });

  const user = sessionQuery.data?.user ?? null;

  const adminProbeQuery = useQuery({
    queryKey: ["admin-probe"],
    queryFn: async () => {
      await apiRequest({
        url: "/admin/products",
        method: "GET",
        params: { page: 1, limit: 1 },
      });
      return true;
    },
    enabled: user !== null,
    staleTime: 10 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    return onSessionExpired(() => {
      clearCsrfToken();
      queryClient.clear();
      queryClient.setQueryData(qk.session, null);
    });
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: qk.session });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await ensureCsrfToken().catch(() => undefined);
      await logoutRequest().catch(() => undefined);
      clearCsrfToken();
      queryClient.clear();
      router.replace("/");
      await queryClient.invalidateQueries();
    } finally {
      setSigningOut(false);
    }
  }, [queryClient, router]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      isLoading: sessionQuery.isPending || signingOut,
      isAdmin: adminProbeQuery.data === true,
      adminProbePending: adminProbeQuery.isPending,
      refreshSession,
      signOut,
    }),
    [
      user,
      sessionQuery.isPending,
      signingOut,
      adminProbeQuery.data,
      adminProbeQuery.isPending,
      refreshSession,
      signOut,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
