import type { IsoDateTime } from "./envelopes";
import type { UserRole, UserStatus } from "./enums";
import type { UserId } from "./auth";

export type AdminCustomerId = UserId;

export interface AdminCustomer {
  public_id: AdminCustomerId;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface UpdateAdminCustomerInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

export interface RoleChangeResponse {
  public_id: AdminCustomerId;
  role: UserRole;
}

export interface AdminAccount {
  public_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  activity_status: "ACTIVE" | "INACTIVE";
  created_at: IsoDateTime;
  last_login_at: IsoDateTime | null;
  last_activity_at: IsoDateTime | null;
  last_action_at: IsoDateTime | null;
  last_action_type: string | null;
}

export interface AdminAccountListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
  activity?: "ACTIVE" | "INACTIVE";
  sort?: string;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  include_deleted?: boolean;
  sort?: "name" | "email" | "created_at";
  desc?: boolean;
}
