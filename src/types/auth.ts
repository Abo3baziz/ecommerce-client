import type { IsoDateTime, PublicId } from "./envelopes";

export type UserId = PublicId<"usr_">;
export type SessionId = PublicId<"ses_">;

export interface AuthSessionResult {
  public_id: UserId;
  email_verified: boolean;
}

export interface SessionUserRef {
  public_id: UserId;
  email_verified: boolean;
}

export interface SessionInfo {
  created_at: IsoDateTime;
  expires_at: IsoDateTime;
}

export interface SessionResponse {
  authenticated: true;
  user: SessionUserRef;
  session: SessionInfo;
}

export interface CsrfTokenResponse {
  csrf_token: string;
}

export interface MessageResponse {
  message: string;
}

export interface EmailChangeVerifyResponse {
  message: string;
  email: string;
  email_verified: boolean;
}

export interface PhoneChangeVerifyResponse {
  message: string;
  phone_number: string;
}

export interface UserSession {
  public_id: SessionId;
  current: boolean;
  device: string;
  ip_address: string;
  last_activity_at: IsoDateTime;
  created_at: IsoDateTime;
}
