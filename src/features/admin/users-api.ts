import { apiRequest } from "@/lib/api/client";
import { sortParam } from "@/lib/api/params";
import type {
  AdminCustomer,
  AdminUserListParams,
  Paginated,
  RoleChangeResponse,
  UpdateAdminCustomerInput,
} from "@/types";
import type { UserRole } from "@/types/enums";

export async function listAdminUsers(
  params: AdminUserListParams = {},
): Promise<Paginated<AdminCustomer>> {
  return apiRequest<Paginated<AdminCustomer>>({
    url: "/admin/users",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      search: params.search || undefined,
      status: params.status || undefined,
      include_deleted: params.include_deleted ? true : undefined,
      sort: sortParam(
        params.sort
          ? { field: params.sort, desc: params.desc }
          : { field: "name", desc: false },
      ),
    },
  });
}

export async function getAdminUser(userId: string): Promise<AdminCustomer> {
  return apiRequest<AdminCustomer>({
    url: `/admin/users/${userId}`,
  });
}

export async function updateAdminUser(
  userId: string,
  input: UpdateAdminCustomerInput,
): Promise<AdminCustomer> {
  return apiRequest<AdminCustomer>({
    url: `/admin/users/${userId}`,
    method: "PATCH",
    data: input,
  });
}

export async function suspendAdminUser(userId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/users/${userId}/suspend`,
    method: "PATCH",
  });
}

export async function activateAdminUser(userId: string): Promise<void> {
  await apiRequest<void>({
    url: `/admin/users/${userId}/activate`,
    method: "PATCH",
  });
}

export async function changeAdminUserRole(
  userId: string,
  role: UserRole,
): Promise<RoleChangeResponse> {
  return apiRequest<RoleChangeResponse>({
    url: `/admin/users/${userId}/role`,
    method: "PATCH",
    data: { role },
  });
}
