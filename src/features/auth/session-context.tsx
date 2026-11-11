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
import { apiRequest, normalizeApiError } from "@/lib/api/client";
import { resetAuthCookies } from "@/lib/api/client";
import { clearCsrfToken, getCsrfToken } from "@/lib/api/csrf";
import { qk } from "@/lib/api/queryKeys";
import { onSessionExpired } from "@/lib/api/session-events";
import { DEMO_MODE, demoSessionOverrides, setAdminWriteAllowed } from "@/lib/demo";
import { getSession, ensureCsrfToken, logout as logoutRequest } from "./api";

export interface SessionContextValue {
  user: { public_id: string; email_verified: boolean } | null;
  isLoading: boolean;
  isAdmin: boolean;
  adminProbePending: boolean;
  isSuperAdmin: boolean;
  superAdminProbePending: boolean;
  /** Public demo visitor: admin-visible UI, but every write is blocked. */
  isReadOnlyDemo: boolean;
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

  // Demo mode: the axios layer blocks /admin writes for visitors (no user)
  // and re-enables them for signed-in admins. No-op when demo mode is off.
  useEffect(() => {
    setAdminWriteAllowed(user !== null);
  }, [user]);

  useEffect(() => {
    if (!sessionQuery.isPending && user && !getCsrfToken()) {
      void ensureCsrfToken().catch(() => undefined);
    }
  }, [sessionQuery.isPending, user]);

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

  // Sessions expose no role; admin/super-admin status is probed against
  // admin-only endpoints (200 vs 403). The backend always enforces real
  // authorization — this only drives UI visibility. In demo mode the probes
  // are skipped and demoSessionOverrides elevates the UI instead.
  const demoFlags = demoSessionOverrides(DEMO_MODE, user !== null);
  const isAdminKnown = adminProbeQuery.data === true || demoFlags.isAdmin;
  const superAdminProbeQuery = useQuery({
    queryKey: ["super-admin-probe"],
    queryFn: async () => {
      await apiRequest({
        url: "/admin/audit",
        method: "GET",
        params: { page: 1, limit: 1 },
      });
      return true;
    },
    enabled: user !== null && isAdminKnown,
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
      try {
        await logoutRequest();
      } catch (error) {
        const err = normalizeApiError(error);
        if (err.status === 401 || err.status === 403) {
          await resetAuthCookies();
        }
      }
      clearCsrfToken();
      queryClient.clear();
      queryClient.setQueryData(qk.session, null);
      router.replace("/");
    } finally {
      setSigningOut(false);
    }
  }, [queryClient, router]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      isLoading: sessionQuery.isPending || signingOut,
      isAdmin: demoFlags.isAdmin || adminProbeQuery.data === true,
      adminProbePending: DEMO_MODE ? false : adminProbeQuery.isPending,
      isSuperAdmin: demoFlags.isSuperAdmin || superAdminProbeQuery.data === true,
      superAdminProbePending: DEMO_MODE
        ? false
        : adminProbeQuery.isPending || superAdminProbeQuery.isPending,
      isReadOnlyDemo: demoFlags.readOnly,
      refreshSession,
      signOut,
    }),
    [
      user,
      sessionQuery.isPending,
      signingOut,
      demoFlags,
      adminProbeQuery.data,
      adminProbeQuery.isPending,
      superAdminProbeQuery.data,
      superAdminProbeQuery.isPending,
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
