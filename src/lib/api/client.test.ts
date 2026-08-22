import AxiosMockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { http } from "./axios-instance";
import { apiRequest, normalizeApiError } from "./client";
import { clearCsrfToken, setCsrfToken } from "./csrf";
import { onSessionExpired } from "./session-events";

let mock: AxiosMockAdapter;

function headersAsRecord(config: { headers?: unknown }): Record<string, unknown> {
  const headers = config.headers as
    | { toJSON?: () => Record<string, unknown> }
    | Record<string, unknown>
    | undefined;
  if (!headers) return {};
  if (typeof headers.toJSON === "function") return headers.toJSON();
  return headers;
}

beforeEach(() => {
  mock = new AxiosMockAdapter(http);
  clearCsrfToken();
});

afterEach(() => {
  mock.restore();
});

describe("apiRequest unwrap", () => {
  it("unwraps envelope A success body to data", async () => {
    const payload = { id: "prd_1", name: "Shoe" };
    mock.onGet("/products/prd_1").reply(200, { success: true, data: payload });

    await expect(apiRequest({ url: "/products/prd_1" })).resolves.toEqual(
      payload,
    );
  });

  it("keeps top-level pagination on list envelopes and derives has_more", async () => {
    mock.onGet("/products").reply(200, {
      success: true,
      data: [{ id: "prd_1" }, { id: "prd_2" }],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const result = await apiRequest<{ data: unknown[]; pagination: unknown }>({
      url: "/products",
    });
    expect(result.data).toHaveLength(2);
    expect(result.pagination).toMatchObject({
      page: 1,
      total: 2,
      hasNext: false,
      has_more: false,
    });
  });

  it("merges top-level pagination into object payloads (product reviews shape)", async () => {
    mock.onGet("/products/prd_1/reviews").reply(200, {
      success: true,
      data: {
        summary: { average_rating: null, total_count: 0 },
        reviews: [],
      },
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });

    const result = await apiRequest<{
      summary?: unknown;
      reviews?: unknown[];
      pagination?: { page: number; has_more: boolean };
    }>({ url: "/products/prd_1/reviews" });

    expect(result.reviews).toEqual([]);
    expect(result.summary).toEqual({ average_rating: null, total_count: 0 });
    expect(result.pagination).toEqual({
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      has_more: false,
    });
  });

  it("derives has_more arithmetically when only page/limit/total are present", async () => {
    mock.onGet("/products/prd_1/reviews").reply(200, {
      success: true,
      data: { summary: { average_rating: 4.5, total_count: 12 }, reviews: [] },
      pagination: { page: 1, limit: 10, total: 12 },
    });

    const result = await apiRequest<{ pagination: { has_more: boolean } }>({
      url: "/products/prd_1/reviews",
    });
    expect(result.pagination.has_more).toBe(true);
  });

  it("normalizes nested pagination inside object payloads", async () => {
    mock.onGet("/users/me/reviews").reply(200, {
      success: true,
      data: {
        reviews: [{ public_id: "rev_1" }],
        pagination: { page: 1, limit: 10, total: 3, has_more: true },
      },
    });

    const result = await apiRequest<{
      reviews: unknown[];
      pagination: { has_more: boolean };
    }>({ url: "/users/me/reviews" });

    expect(result.reviews).toHaveLength(1);
    expect(result.pagination).toMatchObject({ has_more: true });
  });

  it("returns bare bodies as-is", async () => {
    mock.onGet("/health").reply(200, { status: "ok" });
    await expect(apiRequest({ url: "/health" })).resolves.toEqual({
      status: "ok",
    });
  });

  it("returns undefined for empty (204-style) bodies", async () => {
    mock.onDelete("/cart").reply(204);
    await expect(
      apiRequest({ method: "delete", url: "/cart" }),
    ).resolves.toBeUndefined();
  });
});

describe("normalizeApiError via apiRequest", () => {
  it("maps envelope A errors to code + message", async () => {
    mock.onGet("/products").reply(400, {
      error: { code: "VALIDATION_ERROR", message: "Invalid page" },
    });

    await expect(apiRequest({ url: "/products" })).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid page",
    });
  });

  it("maps envelope B errors to message without code", async () => {
    mock.onPost("/orders").reply(409, { success: false, message: "Cart empty" });

    const error = await apiRequest({ method: "post", url: "/orders" }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ status: 409, code: undefined, message: "Cart empty" });
  });

  it("falls back to a generic message for non-JSON error bodies", async () => {
    mock.onGet("/products").reply(500, "<html>boom</html>");

    const error = await apiRequest({ url: "/products" }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ status: 500 });
    expect((error as { message: string }).message).not.toContain("<html>");
  });

  it("preserves status and code when an already-normalized ApiError is re-normalized", () => {
    const normalized = {
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Quantity invalid",
    };
    expect(normalizeApiError(normalized)).toEqual(normalized);
  });
});

describe("CSRF interceptor", () => {
  it("injects x-csrf-token on writes when a token is stored", async () => {
    setCsrfToken("tok-123");
    let sentHeaders: Record<string, unknown> = {};
    mock.onPost("/cart/items").reply((config) => {
      sentHeaders = headersAsRecord(config);
      return [201, { success: true }];
    });

    await apiRequest({ method: "post", url: "/cart/items" });
    expect(sentHeaders["x-csrf-token"]).toBe("tok-123");
  });

  it("omits the header pre-session (register/login writes)", async () => {
    let sentHeaders: Record<string, unknown> = {};
    mock.onPost("/auth/register").reply((config) => {
      sentHeaders = headersAsRecord(config);
      return [201, { success: true }];
    });

    await apiRequest({ method: "post", url: "/auth/register" });
    expect(sentHeaders).not.toHaveProperty("x-csrf-token");
  });

  it("never injects the header on GET even with a token", async () => {
    setCsrfToken("tok-123");
    let sentHeaders: Record<string, unknown> = {};
    mock.onGet("/products").reply((config) => {
      sentHeaders = headersAsRecord(config);
      return [200, { success: true, data: [] }];
    });

    await apiRequest({ url: "/products" });
    expect(sentHeaders).not.toHaveProperty("x-csrf-token");
  });
});

describe("CSRF failure handling", () => {
  function stubCsrfEndpoint(onFetch: () => void): void {
    mock.onGet("/auth/csrf-token").reply(() => {
      onFetch();
      return [200, { success: true, data: { csrf_token: "fresh-tok" } }];
    });
  }

  it("refetches the token once and retries the write successfully", async () => {
    const csrfFetches = vi.fn();
    stubCsrfEndpoint(csrfFetches);
    setCsrfToken("stale-tok");

    let attempts = 0;
    mock
      .onPost("/orders")
      .replyOnce(() => {
        attempts += 1;
        return [
          403,
          { error: { code: "CSRF_TOKEN_INVALID", message: "csrf mismatch" } },
        ];
      })
      .onPost("/orders")
      .reply((config) => {
        attempts += 1;
        const sent = headersAsRecord(config);
        expect(sent["x-csrf-token"]).toBe("fresh-tok");
        return [201, { success: true, data: { id: "ord_1" } }];
      });

    const result = await apiRequest<{ id: string }>({
      method: "post",
      url: "/orders",
    });

    expect(result).toEqual({ id: "ord_1" });
    expect(attempts).toBe(2);
    expect(csrfFetches).toHaveBeenCalledTimes(1);
  });

  it("retries at most once then surfaces the error (no loop)", async () => {
    const csrfFetches = vi.fn();
    stubCsrfEndpoint(csrfFetches);
    setCsrfToken("stale-tok");

    let attempts = 0;
    mock.onPost("/orders").reply(() => {
      attempts += 1;
      return [
        403,
        { error: { code: "CSRF_TOKEN_INVALID", message: "csrf mismatch" } },
      ];
    });

    await expect(
      apiRequest({ method: "post", url: "/orders" }),
    ).rejects.toMatchObject({ status: 403 });

    expect(attempts).toBe(2);
    expect(csrfFetches).toHaveBeenCalledTimes(1);
  });

  it("does not retry plain non-CSRF 403s", async () => {
    const csrfFetches = vi.fn();
    stubCsrfEndpoint(csrfFetches);

    let attempts = 0;
    mock.onPost("/orders").reply(() => {
      attempts += 1;
      return [
        403,
        { error: { code: "FORBIDDEN", message: "Admin only" } },
      ];
    });

    await expect(
      apiRequest({ method: "post", url: "/orders" }),
    ).rejects.toMatchObject({ status: 403 });

    expect(attempts).toBe(1);
    expect(csrfFetches).not.toHaveBeenCalled();
  });
});

describe("session expiry events", () => {
  it("emits session:expired exactly once per 401 response", async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);

    mock.onGet("/me").reply(401, { success: false, message: "Unauthenticated" });

    await expect(apiRequest({ url: "/me" })).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("does not emit for other statuses", async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);

    mock.onGet("/me").reply(403, { error: { code: "FORBIDDEN", message: "no" } });
    await expect(apiRequest({ url: "/me" })).rejects.toMatchObject({
      status: 403,
    });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
