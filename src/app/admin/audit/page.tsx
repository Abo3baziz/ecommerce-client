"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ForbiddenCard } from "@/components/guards";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listAdminAudit } from "@/features/admin/audit-api";
import { useSession } from "@/features/auth/session-context";
import type { AdminAuditEntry } from "@/types";

const ENTITY_TYPES = [
  "",
  "customer",
  "product",
  "category",
  "inventory",
  "order",
  "review",
  "session",
] as const;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function useUrlSyncedInput(key: string) {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const [input, setInput] = useState(searchParams.get(key) ?? "");
  const debounced = useDebouncedValue(input.trim(), 300);
  const current = searchParams.get(key) ?? "";

  useEffect(() => {
    if ((debounced !== "" || current !== "") && debounced !== current) {
      updateParams({ [key]: debounced === "" ? null : debounced, page: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return {
    value: input,
    onChange: (next: string) => {
      setInput(next);
    },
  };
}

function statusClass(status: number): string {
  if (status >= 500) return "bg-red-100 text-red-800 border-red-200";
  if (status >= 400) return "bg-amber-100 text-amber-900 border-amber-300";
  return "bg-green-100 text-green-800 border-green-200";
}

export default function AdminAuditPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();

  if (superAdminProbePending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <ForbiddenCard message="The audit log is only available to the super admin." />
    );
  }

  return <AuditTable />;
}

function AuditTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const actorFilter = useUrlSyncedInput("actor");
  const actionFilter = useUrlSyncedInput("action");
  const [selected, setSelected] = useState<AdminAuditEntry | null>(null);

  const page = parsePage(searchParams.get("page"));
  const entityType = searchParams.get("entity_type") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";

  const query = useQuery({
    queryKey: [
      "admin-audit",
      {
        page,
        actor: searchParams.get("actor") ?? "",
        action: searchParams.get("action") ?? "",
        entityType,
        dateFrom,
        dateTo,
      },
    ],
    queryFn: () =>
      listAdminAudit({
        page,
        limit: 20,
        actor: searchParams.get("actor") ?? undefined,
        action: searchParams.get("action") ?? undefined,
        entity_type: entityType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const hasActiveFilters =
    (searchParams.get("actor") ?? "") !== "" ||
    (searchParams.get("action") ?? "") !== "" ||
    entityType !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every privileged action, newest first. Entries are append-only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-actor">Actor ID</Label>
          <Input
            id="audit-actor"
            placeholder="usr_…"
            autoComplete="off"
            value={actorFilter.value}
            onChange={(e) => actorFilter.onChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-action">Action prefix</Label>
          <Input
            id="audit-action"
            placeholder="admin.users."
            autoComplete="off"
            value={actionFilter.value}
            onChange={(e) => actionFilter.onChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-entity">Entity</Label>
          <select
            id="audit-entity"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={entityType}
            onChange={(e) =>
              updateParams({ entity_type: e.target.value || null, page: null })
            }
          >
            {ENTITY_TYPES.map((value) => (
              <option key={value || "all"} value={value}>
                {value === "" ? "All entities" : value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from">From</Label>
          <Input
            id="audit-from"
            type="date"
            value={dateFrom}
            onChange={(e) =>
              updateParams({ date_from: e.target.value || null, page: null })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to">To</Label>
          <Input
            id="audit-to"
            type="date"
            value={dateTo}
            onChange={(e) =>
              updateParams({ date_to: e.target.value || null, page: null })
            }
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            updateParams({
              actor: null,
              action: null,
              entity_type: null,
              date_from: null,
              date_to: null,
              page: null,
            })
          }
        >
          Clear filters
        </Button>
      ) : null}

      {query.isError ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "No entries match these filters" : "No audit entries yet"}
          description={
            hasActiveFilters
              ? "Try adjusting or clearing the filters."
              : "Privileged actions will appear here as they happen."
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((entry) => (
                <TableRow
                  key={entry.public_id}
                  className="cursor-pointer"
                  onClick={() => setSelected(entry)}
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="block text-sm">{entry.actor.name ?? "—"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.actor.email ?? "anonymous"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs">{entry.action}</code>
                  </TableCell>
                  <TableCell className="max-w-64 truncate font-mono text-xs text-muted-foreground">
                    {entry.method} {entry.path}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(statusClass(entry.status_code))}
                    >
                      {entry.status_code}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {query.data ? (
            <PaginationFromStandard
              pagination={query.data.pagination}
              onPageChange={(next) => updateParams({ page: String(next) })}
            />
          ) : null}
        </>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">
                  {selected.action}
                </DialogTitle>
                <DialogDescription>
                  {formatDateTime(selected.created_at)} · by{" "}
                  {selected.actor.name ?? "anonymous"}
                  {selected.actor.email ? ` (${selected.actor.email})` : ""}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="outline" className={statusClass(selected.status_code)}>
                    {selected.status_code}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">Entity</dt>
                <dd className="break-all">
                  {selected.entity_type
                    ? `${selected.entity_type} · ${selected.entity_public_id ?? "—"}`
                    : "—"}
                </dd>
                <dt className="text-muted-foreground">Request</dt>
                <dd className="break-all font-mono text-xs">
                  {selected.method} {selected.path}
                </dd>
                <dt className="text-muted-foreground">IP</dt>
                <dd>{selected.ip_address ?? "—"}</dd>
                <dt className="text-muted-foreground">User agent</dt>
                <dd className="break-all text-xs text-muted-foreground">
                  {selected.user_agent ?? "—"}
                </dd>
              </dl>
              {selected.request_body !== null &&
              selected.request_body !== undefined ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Payload (sensitive fields redacted)
                  </span>
                  <pre className="max-h-56 overflow-auto rounded-md border bg-muted p-3 text-xs">
                    {JSON.stringify(selected.request_body, null, 2)}
                  </pre>
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
