import { http } from "./axios-instance";
import type { CsrfTokenResponse } from "@/types/auth";

let csrfToken: string | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

export async function fetchCsrfToken(): Promise<string> {
  const res = await http.get<{ success: true; data: CsrfTokenResponse }>(
    "/auth/csrf-token",
  );
  csrfToken = res.data.data.csrf_token;
  return csrfToken;
}
