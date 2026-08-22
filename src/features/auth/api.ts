import { apiRequest, normalizeApiError } from "@/lib/api/client";
import { fetchCsrfToken } from "@/lib/api/csrf";
import type {
  AuthSessionResult,
  EmailChangeVerifyResponse,
  MessageResponse,
  SessionResponse,
  UserSession,
} from "@/types/auth";
import type { LoginValues, RegisterValues } from "./schemas";

export async function getSession(): Promise<SessionResponse | null> {
  try {
    return await apiRequest<SessionResponse>({ url: "/auth/session" });
  } catch (error) {
    const err = normalizeApiError(error);
    if (err.status === 401 || err.status === 403 || err.status === 0) {
      return null;
    }
    throw err;
  }
}

export function ensureCsrfToken(): Promise<string> {
  return fetchCsrfToken();
}

export async function listSessions(): Promise<UserSession[]> {
  return apiRequest<UserSession[]>({ url: "/auth/sessions" });
}

export async function revokeOtherSessions(): Promise<void> {
  await apiRequest<void>({ url: "/auth/sessions", method: "DELETE" });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiRequest<void>({
    url: `/auth/sessions/${sessionId}`,
    method: "DELETE",
  });
}

export async function logout(): Promise<void> {
  await apiRequest<MessageResponse>({
    url: "/auth/session",
    method: "DELETE",
  });
}

export async function register(
  values: RegisterValues,
): Promise<AuthSessionResult> {
  return apiRequest<AuthSessionResult>({
    url: "/auth/register",
    method: "POST",
    data: values,
  });
}

export async function login(values: LoginValues): Promise<AuthSessionResult> {
  return apiRequest<AuthSessionResult>({
    url: "/auth/login",
    method: "POST",
    data: values,
  });
}

export async function verifyEmailRegistration(
  token: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>({
    url: "/auth/email-verification/verify",
    method: "POST",
    data: { token },
  });
}

export async function resendEmailVerification(): Promise<MessageResponse> {
  return apiRequest<MessageResponse>({
    url: "/auth/email-verification/resend",
    method: "POST",
  });
}

export async function verifyEmailChange(
  token: string,
): Promise<EmailChangeVerifyResponse> {
  return apiRequest<EmailChangeVerifyResponse>({
    url: "/users/me/email/verify",
    method: "POST",
    data: { token },
  });
}
