"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/features/auth/session-context";

function GateLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      const from = encodeURIComponent(pathname);
      router.replace(`/login?from=${from}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) {
    return <GateLoader />;
  }
  return <>{children}</>;
}

export function PublicOnlyGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading && user) {
      const next = searchParams.get("from");
      router.replace(next && next.startsWith("/") ? next : "/");
    }
  }, [isLoading, user, router, searchParams]);

  if (isLoading || user) {
    return <GateLoader />;
  }
  return <>{children}</>;
}

export function ForbiddenCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Access restricted</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">Back to store</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading, adminProbePending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const authedKnown = !isLoading;
  const staffKnown = !adminProbePending;

  useEffect(() => {
    if (!isLoading && !user) {
      const from = encodeURIComponent(pathname);
      router.replace(`/login?from=${from}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || (authedKnown && user !== null && !staffKnown)) {
    return <GateLoader />;
  }
  if (!user) {
    return <GateLoader />;
  }
  if (!isAdmin) {
    return (
      <ForbiddenCard message="This area is only available to store administrators." />
    );
  }
  return <>{children}</>;
}

// Super-admin-only surface (Analytics). Sessions expose no role, so the gate
// relies on the super-admin probe; the backend independently returns 403 to
// every analytics API call from non-super-admins.
export function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, superAdminProbePending } = useSession();

  if (superAdminProbePending) {
    return <GateLoader />;
  }
  if (!isSuperAdmin) {
    return (
      <ForbiddenCard message="This section is only available to the platform super admin." />
    );
  }
  return <>{children}</>;
}
