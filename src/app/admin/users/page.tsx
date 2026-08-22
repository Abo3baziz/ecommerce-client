"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Check,
  EllipsisVertical,
  Pencil,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TooltipIconButton } from "@/components/shared/tooltip-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromStandard } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { qk } from "@/lib/api/queryKeys";
import type { AdminCustomer, AdminUserListParams } from "@/types/admin-users";
import type { UserStatus } from "@/types/enums";
import type { ApiError } from "@/types/envelopes";
import {
  activateAdminUser,
  listAdminUsers,
  suspendAdminUser,
} from "@/features/admin/users-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/format";
import { EditUserDialog } from "@/features/admin/user-components/edit-user-dialog";
import { UserRoleDialog } from "@/features/admin/user-components/user-role-dialog";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";

const USER_SORTS = ["name", "email", "created_at"] as const;
const USER_STATUSES_FILTER: readonly UserStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
];

type UserSortField = (typeof USER_SORTS)[number];

function parseSortField(value: string | null): UserSortField {
  if (value !== null && (USER_SORTS as readonly string[]).includes(value)) {
    return value as UserSortField;
  }
  return "name";
}

function parsePage(value: string | null): number {
  const parsed = Number(value ?? "1");
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 1;
}

function parseStatus(value: string | null): UserStatus | null {
  if (
    value !== null &&
    (USER_STATUSES_FILTER as readonly string[]).includes(value)
  ) {
    return value as UserStatus;
  }
  return null;
}

function useUrlSyncedInput(key: string) {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const urlValue = searchParams.get(key) ?? "";
  const [input, setInput] = useState(urlValue);
  const debouncedInput = useDebouncedValue(input, 300);

  useEffect(() => {
    if (debouncedInput !== urlValue) {
      updateParams({
        [key]: debouncedInput.trim() === "" ? null : debouncedInput.trim(),
        page: null,
      });
    }
  }, [debouncedInput, urlValue, key, updateParams]);

  return { value: input, onChange: setInput };
}

interface StatusActionState {
  user: AdminCustomer;
  action: "suspend" | "activate";
}

function UsersTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminCustomer | null>(null);
  const [changingRoleFor, setChangingRoleFor] = useState<AdminCustomer | null>(
    null,
  );
  const [statusAction, setStatusAction] = useState<StatusActionState | null>(
    null,
  );

  const page = parsePage(searchParams.get("page"));
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = parseStatus(searchParams.get("status"));
  const includeDeleted = searchParams.get("deleted") === "1";
  const sortField = parseSortField(searchParams.get("sort"));
  const desc = searchParams.get("dir") === "desc";

  const search = useUrlSyncedInput("search");

  const params: AdminUserListParams = {
    page,
    limit: 20,
    ...(searchTerm !== "" ? { search: searchTerm } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    sort: sortField,
    desc,
    include_deleted: includeDeleted,
  };

  const query = useQuery({
    queryKey: qk.admin.users(params),
    queryFn: () => listAdminUsers(params),
  });

  async function invalidateUsers() {
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function runStatusAction() {
    if (!statusAction) return;
    const { user, action } = statusAction;
    try {
      if (action === "suspend") {
        await suspendAdminUser(user.public_id);
        toast.success(
          `${user.first_name} ${user.last_name} suspended — their sessions were revoked.`,
        );
      } else {
        await activateAdminUser(user.public_id);
        toast.success(`${user.first_name} ${user.last_name} reactivated.`);
      }
      await invalidateUsers();
    } catch (error) {
      const apiError = error as ApiError;
      if (
        apiError.status === 400 &&
        /already/i.test(apiError.message || "")
      ) {
        toast.info(apiError.message || "User is already in this state.");
        return;
      }
      toast.error(apiError.message || "Could not update the user's status.");
      throw error;
    }
  }

  function changePage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
  }

  const rows = query.data?.data ?? [];
  const hasFilters =
    searchTerm !== "" || statusFilter !== null || includeDeleted;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="user-search"
              value={search.value}
              placeholder="Name or email"
              className="w-60 pl-8"
              autoComplete="off"
              onChange={(e) => search.onChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="user-status" className="text-sm font-normal">
            Status
          </Label>
          <Select
            value={statusFilter ?? "all"}
            onValueChange={(value) =>
              updateParams({ status: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger id="user-status" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {USER_STATUSES_FILTER.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="user-sort" className="text-sm font-normal">
            Sort
          </Label>
          <Select
            value={sortField}
            onValueChange={(value) => updateParams({ sort: value, page: null })}
          >
            <SelectTrigger id="user-sort" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={desc ? "desc" : "asc"}
            onValueChange={(value) =>
              updateParams({ dir: value === "desc" ? "desc" : null, page: null })
            }
          >
            <SelectTrigger aria-label="Sort direction" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="users-deleted"
            checked={includeDeleted}
            onCheckedChange={(checked) =>
              updateParams({ deleted: checked ? "1" : null, page: null })
            }
          />
          <Label htmlFor="users-deleted" className="text-sm font-normal">
            Include deleted
          </Label>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            hasFilters ? "No customers match your filters" : "No customers yet"
          }
          description={
            hasFilters
              ? "Try adjusting the search or filters."
              : "Customers will appear here after they register."
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                  <TableRow
                    key={user.public_id}
                    className={
                      user.status === "DELETED" ? "opacity-50" : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {user.phone_number || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={user.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={user.role} />
                    </TableCell>
                    <TableCell>
                      {user.email_verified ? (
                        <Check
                          aria-label="Email verified"
                          className="size-4 text-green-600"
                        />
                      ) : (
                        <X
                          aria-label="Email not verified"
                          className="size-4 text-muted-foreground"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <TooltipIconButton
                            variant="ghost"
                            size="icon-sm"
                            side="left"
                            label={`Actions for ${user.email}`}
                          >
                            <EllipsisVertical aria-hidden className="size-4" />
                          </TooltipIconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(user)}>
                            <Pencil aria-hidden className="size-4" />
                            Edit details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setChangingRoleFor(user)
                            }
                          >
                            <Shield aria-hidden className="size-4" />
                            Change role
                          </DropdownMenuItem>
                          {user.status === "ACTIVE" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatusAction({ user, action: "suspend" })
                              }
                            >
                              <Ban aria-hidden className="size-4" />
                              Suspend
                            </DropdownMenuItem>
                          ) : user.status === "SUSPENDED" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setStatusAction({ user, action: "activate" })
                              }
                            >
                              <Check aria-hidden className="size-4" />
                              Activate
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
          {query.data ? (
            <PaginationFromStandard
              pagination={query.data.pagination}
              onPageChange={changePage}
            />
          ) : null}
        </>
      )}

      {editing ? (
        <EditUserDialog
          open
          user={editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      {changingRoleFor ? (
        <UserRoleDialog
          open
          user={changingRoleFor}
          onOpenChange={(open) => {
            if (!open) setChangingRoleFor(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={statusAction?.action === "suspend"}
        onOpenChange={(open) => {
          if (!open) setStatusAction(null);
        }}
        title={`Suspend ${statusAction?.user.first_name ?? ""} ${statusAction?.user.last_name ?? ""}?`}
        description="Suspending this account revokes all of their active sessions immediately and blocks new sign-ins."
        confirmLabel="Suspend user"
        destructive
        onConfirm={runStatusAction}
      />

      <ConfirmDialog
        open={statusAction?.action === "activate"}
        onOpenChange={(open) => {
          if (!open) setStatusAction(null);
        }}
        title={`Activate ${statusAction?.user.first_name ?? ""} ${statusAction?.user.last_name ?? ""}?`}
        description="The customer will be able to sign in again immediately."
        confirmLabel="Activate user"
        onConfirm={runStatusAction}
      />
    </div>
  );
}

function UsersPageContent() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage customer accounts, access and roles.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}
