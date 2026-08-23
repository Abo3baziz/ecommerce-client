"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ForbiddenCard } from "@/components/guards";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";
import {
  activateAdminAccount,
  listAdminAccounts,
  suspendAdminAccount,
} from "@/features/admin/admins-api";
import { listAdminAudit } from "@/features/admin/audit-api";
import { useSession } from "@/features/auth/session-context";
import type { AdminAccount } from "@/types";
import type { ApiError } from "@/types/envelopes";

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export default function AdminManagementPage() {
  const { isSuperAdmin, superAdminProbePending } = useSession();

  if (superAdminProbePending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!isSuperAdmin) {
    return (
      <ForbiddenCard message="Admin management is only available to the platform super admin." />
    );
  }

  return <AdminsTable />;
}

function AdminsTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const currentSearch = searchParams.get("search") ?? "";

  useEffect(() => {
    if ((debouncedSearch !== "" || currentSearch !== "") && debouncedSearch !== currentSearch) {
      updateParams({ search: debouncedSearch === "" ? null : debouncedSearch, page: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const page = parsePage(searchParams.get("page"));
  const statusFilter = (searchParams.get("status") ?? "") as "" | "ACTIVE" | "SUSPENDED";
  const activityFilter = (searchParams.get("activity") ?? "") as "" | "ACTIVE" | "INACTIVE";
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const sortField = searchParams.get("sort") ?? "last_login_at";

  const [detailFor, setDetailFor] = useState<AdminAccount | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { account: AdminAccount; action: "suspend" | "activate" }
    | null
  >(null);

  const params = {
    page,
    limit: 20,
    search: currentSearch || undefined,
    status: statusFilter || undefined,
    activity: activityFilter || undefined,
  };

  const query = useQuery({
    queryKey: ["admin-accounts", params],
    queryFn: () => listAdminAccounts(params),
    placeholderData: (previous) => previous,
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
  }

  function toggleSort(field: string) {
    const next =
      sortField === field && sortDir === "desc"
        ? { sort: field, dir: "asc" }
        : { sort: field, dir: "desc" };
    updateParams(next);
  }

  const accounts = query.data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin accounts and their recent activity across the platform.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search admins"
          placeholder="Search name or email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-60"
        />
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) =>
            updateParams({ status: value === "all" ? null : value, page: null })
          }
        >
          <SelectTrigger aria-label="Account status" className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={activityFilter || "all"}
          onValueChange={(value) =>
            updateParams({ activity: value === "all" ? null : value, page: null })
          }
        >
          <SelectTrigger aria-label="Activity status" className="w-44">
            <SelectValue placeholder="Any activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any activity</SelectItem>
            <SelectItem value="ACTIVE">Active recently</SelectItem>
            <SelectItem value="INACTIVE">Inactive 2+ days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Skeleton className="h-80 w-full" />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No admins match these filters"
          description="Try adjusting the search or filters."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Name" field="name" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                <TableHead>Role</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Activity</TableHead>
                <SortHead label="Last login" field="last_login_at" activeField={sortField} dir={sortDir} onSort={toggleSort} />
                <TableHead>Last action</TableHead>
                <SortHead label="Created" field="created_at" activeField={sortField} dir={sortDir} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.public_id}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={() => setDetailFor(account)}
                    >
                      <span className="block font-medium">{account.first_name} {account.last_name}</span>
                      <span className="block text-xs text-muted-foreground">{account.email}</span>
                    </button>
                  </TableCell>
                  <TableCell><StatusBadge value={account.role} /></TableCell>
                  <TableCell><StatusBadge value={account.status} /></TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          account.activity_status === "ACTIVE" ? "bg-green-500" : "bg-zinc-400",
                        )}
                      />
                      {account.activity_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.last_login_at ? formatDateTime(account.last_login_at) : "Never"}
                  </TableCell>
                  <TableCell className="max-w-52 truncate text-xs text-muted-foreground">
                    {account.last_action_type
                      ? `${account.last_action_type} · ${formatDateTime(account.last_action_at)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(account.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationFromStandard
            pagination={query.data.pagination}
            onPageChange={(next) => updateParams({ page: String(next) })}
          />
        </>
      )}

      <AdminDetailDrawer
        account={detailFor}
        onClose={() => setDetailFor(null)}
        onRequestStatus={(account, action) => setConfirmAction({ account, action })}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.action === "suspend" ? "Suspend this admin?" : "Reactivate this admin?"}
        description={
          confirmAction
            ? confirmAction.action === "suspend"
              ? `${confirmAction.account.first_name} will be signed out everywhere and unable to sign in until reactivated.`
              : `${confirmAction.account.first_name} will be able to sign in again.`
            : undefined
        }
        confirmLabel={confirmAction?.action === "suspend" ? "Suspend admin" : "Reactivate"}
        destructive={confirmAction?.action === "suspend"}
        onConfirm={async () => {
          if (!confirmAction) return;
          try {
            if (confirmAction.action === "suspend") {
              await suspendAdminAccount(confirmAction.account.public_id);
              toast.success(`${confirmAction.account.first_name} suspended`);
            } else {
              await activateAdminAccount(confirmAction.account.public_id);
              toast.success(`${confirmAction.account.first_name} reactivated`);
            }
            await invalidate();
          } catch (error) {
            const err = error as ApiError;
            toast.error(err.message || "Action failed.");
          }
          setConfirmAction(null);
        }}
      />
    </div>
  );
}

function SortHead({
  label,
  field,
  activeField,
  dir,
  onSort,
}: {
  label: string;
  field: string;
  activeField: string;
  dir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const active = activeField.replace("-", "") === field;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "font-medium text-foreground",
        )}
      >
        {label}
        {active ? (dir === "asc" ? "↑" : "↓") : ""}
      </button>
    </TableHead>
  );
}

function AdminDetailDrawer({
  account,
  onClose,
  onRequestStatus,
}: {
  account: AdminAccount | null;
  onClose: () => void;
  onRequestStatus: (account: AdminAccount, action: "suspend" | "activate") => void;
}) {
  const activityQuery = useQuery({
    queryKey: ["admin-audit", { actor: account?.public_id }],
    enabled: account !== null,
    queryFn: () => listAdminAudit({ actor: account!.public_id, limit: 10 }),
  });

  return (
    <Drawer open={account !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <div className="mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-y-auto px-4 pb-8 pt-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>{account ? `${account.first_name} ${account.last_name}` : ""}</DrawerTitle>
            <DrawerDescription>
              {account ? `${account.role} · ${account.email}` : ""}
            </DrawerDescription>
          </DrawerHeader>

          {account ? (
            <Tabs defaultValue="profile" className="mt-2">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="flex flex-col gap-4 pt-3 text-sm">
                <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all">{account.email}</dd>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{account.phone_number}</dd>
                  <dt className="text-muted-foreground">Role</dt>
                  <dd><StatusBadge value={account.role} /></dd>
                  <dt className="text-muted-foreground">Account</dt>
                  <dd><StatusBadge value={account.status} /></dd>
                  <dt className="text-muted-foreground">Activity</dt>
                  <dd>{account.activity_status}</dd>
                  <dt className="text-muted-foreground">Last login</dt>
                  <dd>{account.last_login_at ? formatDateTime(account.last_login_at) : "Never"}</dd>
                  <dt className="text-muted-foreground">Last action</dt>
                  <dd>
                    {account.last_action_type
                      ? `${account.last_action_type} · ${formatDateTime(account.last_action_at)}`
                      : "—"}
                  </dd>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDateTime(account.created_at)}</dd>
                </dl>

                {account.role !== "SUPER_ADMIN" ? (
                  <div className="mt-2 flex flex-wrap gap-2 border-t pt-3">
                    {account.status === "SUSPENDED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRequestStatus(account, "activate")}
                      >
                        Reactivate account
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onRequestStatus(account, "suspend")}
                      >
                        Suspend admin
                      </Button>
                    )}
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="activity" className="pt-3">
                {activityQuery.isPending ? (
                  <Skeleton className="h-40 w-full" />
                ) : activityQuery.isError ? (
                  <ErrorState
                    error={activityQuery.error as unknown as ApiError}
                    onRetry={() => void activityQuery.refetch()}
                  />
                ) : activityQuery.data.data.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No logged actions yet.
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border text-sm">
                    {activityQuery.data.data.map((entry) => (
                      <li key={entry.public_id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="min-w-0">
                          <code className="block truncate text-xs">{entry.action}</code>
                          <span className="block text-xs text-muted-foreground">
                            {entry.method ?? ""} {entry.path ?? ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDateTime(entry.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
