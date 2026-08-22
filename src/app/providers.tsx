"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SessionProvider } from "@/features/auth/session-context";

const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 409, 422]);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const status =
                typeof error === "object" && error !== null && "status" in error
                  ? (error as { status?: unknown }).status
                  : undefined;
              if (
                typeof status === "number" &&
                NO_RETRY_STATUSES.has(status)
              ) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
