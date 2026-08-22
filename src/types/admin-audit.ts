import type { IsoDateTime } from "./envelopes";

export interface AdminAuditActor {
  public_id: string | null;
  name: string | null;
  email: string | null;
}

export interface AdminAuditEntry {
  public_id: string;
  action: string;
  entity_type: string | null;
  entity_public_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number;
  request_body: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: IsoDateTime;
  actor: AdminAuditActor;
}

export interface AdminAuditListParams {
  page?: number;
  limit?: number;
  actor?: string;
  action?: string;
  entity_type?: string;
  entity_public_id?: string;
  date_from?: string;
  date_to?: string;
}
