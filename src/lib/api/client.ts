import axios, { AxiosError, AxiosHeaders } from "axios";
import type { AxiosRequestConfig } from "axios";
import { isEnvelope, hasPagination } from "@/types/envelopes";
import type { ApiError, ListPagination } from "@/types/envelopes";
import { http } from "./axios-instance";
import {
  clearCsrfToken,
  fetchCsrfToken,
  getCsrfToken,
} from "./csrf";
import { emitSessionExpired } from "./session-events";

const WRITE_METHODS = new Set(["post", "patch", "put", "delete"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data: unknown = error.response?.data;
    if (isRecord(data)) {
      const err = data.error;
      if (isRecord(err) && typeof err.code === "string") {
        return {
          status,
          code: err.code,
          message:
            typeof err.message === "string"
              ? err.message
              : `Request failed (${status})`,
        };
      }
      if (typeof data.message === "string") {
        return {
          status,
          code: typeof data.code === "string" ? data.code : undefined,
          message: data.message,
        };
      }
    }
    return {
      status,
      message: error.message || `Request failed (${status})`,
    };
  }
  if (
    isRecord(error) &&
    typeof error.status === "number" &&
    typeof error.message === "string"
  ) {
    return {
      status: error.status,
      code: typeof error.code === "string" ? error.code : undefined,
      message: error.message,
    };
  }
  return {
    status: 0,
    message: error instanceof Error ? error.message : "Unexpected error",
  };
}

function isCsrfFailure(error: AxiosError): boolean {
  const code = (error.response?.data as { error?: { code?: string } })?.error
    ?.code;
  if (typeof code === "string" && /csrf/i.test(code)) return true;
  const message = (
    error.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined
  )?.error?.message;
  const flatMessage =
    typeof message === "string"
      ? message
      : ((error.response?.data as { message?: string } | undefined)?.message ??
        "");
  return typeof flatMessage === "string" && /csrf/i.test(flatMessage);
}

type RetriableConfig = AxiosRequestConfig & {
  _csrfRetried?: boolean;
  _authResetRetried?: boolean;
  _csrfProbe?: boolean;
};

export async function resetAuthCookies(): Promise<void> {
  try {
    await fetch("/api/auth-cookie-reset", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    return;
  }
}

http.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase() ?? "";
  if (WRITE_METHODS.has(method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers.set("x-csrf-token", token);
    }
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      throw error;
    }
    const status = error.response?.status;
    const config = error.config as RetriableConfig | undefined;

    if (
      status === 403 &&
      config &&
      !config._csrfRetried &&
      isCsrfFailure(error)
    ) {
      config._csrfRetried = true;
      try {
        await fetchCsrfToken();
      } catch (refreshError) {
        const refreshStatus = normalizeApiError(refreshError).status;
        if (refreshStatus === 401 || refreshStatus === 403) {
          clearCsrfToken();
          await resetAuthCookies();
          emitSessionExpired();
          const method = config.method?.toLowerCase() ?? "";
          const url = config.url ?? "";
          if (
            method === "post" &&
            url.startsWith("/auth/") &&
            !config._authResetRetried
          ) {
            config._authResetRetried = true;
            return http.request(config);
          }
        }
        throw normalizeApiError(error);
      }
      const token = getCsrfToken();
      if (token) {
        const headers = AxiosHeaders.concat(
          config.headers as never,
          { "x-csrf-token": token },
        );
        config.headers = headers;
      }
      return http.request(config);
    }

    if (status === 401 && !(config as RetriableConfig | undefined)?._csrfProbe) {
      emitSessionExpired();
    }

    throw normalizeApiError(error);
  },
);

function normalizePagination(raw: unknown): ListPagination | undefined {
  if (!isRecord(raw)) return undefined;
  const page = typeof raw.page === "number" ? raw.page : 1;
  const limit = typeof raw.limit === "number" ? raw.limit : 0;
  const total = typeof raw.total === "number" ? raw.total : 0;
  const hasNext = typeof raw.hasNext === "boolean" ? raw.hasNext : undefined;
  const has_more =
    typeof raw.has_more === "boolean"
      ? raw.has_more
      : (hasNext ?? (limit > 0 ? page * limit < total : false));
  return {
    page,
    limit,
    total,
    totalPages: typeof raw.totalPages === "number" ? raw.totalPages : undefined,
    hasNext,
    hasPrev: typeof raw.hasPrev === "boolean" ? raw.hasPrev : undefined,
    has_more,
  };
}

function unwrap<T>(body: unknown): T {
  if (body === "" || body === undefined || body === null) {
    return undefined as T;
  }
  if (!isEnvelope(body)) {
    return body as T;
  }
  if (hasPagination(body)) {
    const pagination = normalizePagination(body.pagination);
    if (pagination) {
      if (Array.isArray(body.data)) {
        return { ...body, pagination } as T;
      }
      if (isRecord(body.data)) {
        return { ...body.data, pagination } as T;
      }
      return { ...body, pagination } as T;
    }
  }
  if (
    isRecord(body.data) &&
    isRecord((body.data as Record<string, unknown>).pagination)
  ) {
    const nested = normalizePagination(
      (body.data as Record<string, unknown>).pagination,
    );
    if (nested) {
      return { ...(body.data as Record<string, unknown>), pagination: nested } as T;
    }
  }
  return body.data as T;
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await http.request<unknown>(config);
    return unwrap<T>(res.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
