import { apiRequest } from "@/lib/api/client";
import type {
  AdminAccount,
  AdminAccountListParams,
  Paginated,
} from "@/types";

export async function listAdminAccounts(
  params: AdminAccountListParams = {},
): Promise<Paginated<AdminAccount>> {
  return apiRequest<Paginated<AdminAccount>>({
    url: "/admin/admins",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      status: params.status || undefined,
      activity: params.activity || undefined,
      sort: params.sort || "-last_login_at",
    },
  });
}

export async function suspendAdminAccount(adminId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/admins/${adminId}/suspend`,
    method: "PATCH",
  });
}

export async function activateAdminAccount(adminId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/admins/${adminId}/activate`,
    method: "PATCH",
  });
}
