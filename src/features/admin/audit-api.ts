import { apiRequest } from "@/lib/api/client";
import type { AdminAuditEntry, AdminAuditListParams, Paginated } from "@/types";

export async function listAdminAudit(
  params: AdminAuditListParams = {},
): Promise<Paginated<AdminAuditEntry>> {
  return apiRequest<Paginated<AdminAuditEntry>>({
    url: "/admin/audit",
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      actor: params.actor || undefined,
      action: params.action || undefined,
      entity_type: params.entity_type || undefined,
      entity_public_id: params.entity_public_id || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    },
  });
}
