import type { IsoDateTime, PublicId } from "./envelopes";
import type { UserId } from "./auth";

export type { UserId };

export type AddressId = PublicId<"adr_">;

export interface UserProfile {
  public_id: UserId;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  email_verified: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export interface ChangeEmailInput {
  new_email: string;
  password: string;
}

export interface ChangePhoneInput {
  new_phone_number: string;
  password: string;
}

export interface VerifyTokenInput {
  token: string;
}

export interface VerifyOtpInput {
  otp: string;
}

export interface DeleteAccountInput {
  password: string;
}

export interface Address {
  public_id: AddressId;
  recipient_name: string;
  phone_number: string;
  label: string | null;
  country: string;
  state: string;
  city: string;
  address_1: string;
  address_2: string | null;
  zip_code: string | null;
  is_default_shipping: boolean;
  is_default_billing: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface AddressInput {
  recipient_name: string;
  phone_number: string;
  label?: string;
  country: string;
  state: string;
  city: string;
  address_1: string;
  address_2?: string;
  zip_code?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

export type AddressUpdateInput = Partial<AddressInput>;
