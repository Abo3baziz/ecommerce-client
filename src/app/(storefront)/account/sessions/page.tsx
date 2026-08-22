"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useSession } from "@/features/auth/session-context";
import { revokeOtherSessions, revokeSession } from "@/features/auth/api";
import { useSessions } from "@/features/account/hooks";
import { qk } from "@/lib/api/queryKeys";
import { formatDate, formatRelative } from "@/lib/format";
import type { UserSession } from "@/types";

export default function AccountSessionsPage() {
  const sessionsQuery = useSessions();
  const queryClient = useQueryClient();
  const { signOut } = useSession();
  const [revoking, setRevoking] = useState<UserSession | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: qk.sessions });
  }

  async function handleRevokeOne() {
    if (!revoking) {
      return;
    }
    const wasCurrent = revoking.current;
    try {
      await revokeSession(revoking.public_id);
      if (wasCurrent) {
        toast.success("This device has been signed out.");
        await signOut();
        return;
      }
      toast.success("Session revoked.");
    } catch (error) {
      const err = error as { status?: number; message?: string };
      if (err.status === 401 || err.status === 404) {
        await signOut();
        return;
      }
      toast.error(err.message || "Could not revoke the session.");
    }
    await refresh();
  }

  async function handleRevokeOthers() {
    try {
      await revokeOtherSessions();
      toast.success("All other sessions have been revoked.");
    } catch (error) {
      const err = error as { status?: number; message?: string };
      if (err.status === 401) {
        await signOut();
        return;
      }
      toast.error(err.message || "Could not revoke other sessions.");
    }
    await refresh();
  }

  const data = sessionsQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Devices &amp; sessions</CardTitle>
              <CardDescription>
                Places where you are currently signed in.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={sessionsQuery.isPending || !data || data.length <= 1}
              onClick={() => setRevokeAllOpen(true)}
            >
              Revoke all other sessions
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : sessionsQuery.isError ? (
            <ErrorState
              error={sessionsQuery.error}
              onRetry={() => void sessionsQuery.refetch()}
            />
          ) : !data || data.length === 0 ? (
            <EmptyState
              title="No active sessions"
              description="Sign in to see your active devices here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP address</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>Signed in</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((session) => (
                  <TableRow key={session.public_id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        {session.device}
                        {session.current ? (
                          <Badge variant="secondary">This device</Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.ip_address}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelative(session.last_activity_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(session.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRevoking(session)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevoking(null);
          }
        }}
        destructive
        title={revoking?.current ? "Sign out this device?" : "Revoke session?"}
        description={
          revoking
            ? `${revoking.device} (${revoking.ip_address}) will be signed out immediately.`
            : undefined
        }
        confirmLabel={revoking?.current ? "Sign out" : "Revoke"}
        onConfirm={handleRevokeOne}
      />

      <ConfirmDialog
        open={revokeAllOpen}
        onOpenChange={setRevokeAllOpen}
        destructive
        title="Revoke all other sessions?"
        description="Every other signed-in device will be logged out. This device stays signed in."
        confirmLabel="Revoke all others"
        onConfirm={handleRevokeOthers}
      />
    </div>
  );
}
