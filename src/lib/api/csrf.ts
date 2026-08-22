import { http } from "./axios-instance";
import type { CsrfTokenResponse } from "@/types/auth";

let csrfToken: string | null = null;
let inflight: Promise<string> | null = null;

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

export function fetchCsrfToken(): Promise<string> {
  if (!inflight) {
    inflight = http
      .get<{ success: true; data: CsrfTokenResponse }>("/auth/csrf-token", {
        _csrfProbe: true,
      } as never)
      .then((res) => {
        csrfToken = res.data.data.csrf_token;
        return csrfToken;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
