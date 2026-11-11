import { afterEach, describe, expect, it } from "vitest";
import {
  DEMO_MODE,
  demoBlocksAdminWrite,
  demoSessionOverrides,
  isAdminWriteBlocked,
  setAdminWriteAllowed,
} from "./demo";

describe("demoBlocksAdminWrite", () => {
  it("never blocks anything when demo mode is off", () => {
    const state = { demoMode: false, adminWriteAllowed: false };
    expect(demoBlocksAdminWrite(state, "post", "/admin/products")).toBe(false);
    expect(demoBlocksAdminWrite(state, "delete", "/admin/orders/o1")).toBe(false);
  });

  it("blocks mutating /admin requests for demo visitors", () => {
    const state = { demoMode: true, adminWriteAllowed: false };
    expect(demoBlocksAdminWrite(state, "post", "/admin/products")).toBe(true);
    expect(demoBlocksAdminWrite(state, "patch", "/admin/orders/ord_01")).toBe(
      true,
    );
    expect(demoBlocksAdminWrite(state, "delete", "/admin/coupons/c_1")).toBe(
      true,
    );
    expect(demoBlocksAdminWrite(state, "put", "/admin/categories/c_1/products")).toBe(
      true,
    );
  });

  it("blocks /admin writes even with query strings attached", () => {
    const state = { demoMode: true, adminWriteAllowed: false };
    expect(
      demoBlocksAdminWrite(state, "post", "/admin/products?tab=variants"),
    ).toBe(true);
  });

  it("does not block /admin reads for demo visitors", () => {
    const state = { demoMode: true, adminWriteAllowed: false };
    expect(demoBlocksAdminWrite(state, "get", "/admin/products")).toBe(false);
    expect(demoBlocksAdminWrite(state, "get", "/admin/stats")).toBe(false);
  });

  it("does not touch storefront or auth flows in demo mode", () => {
    const state = { demoMode: true, adminWriteAllowed: false };
    expect(demoBlocksAdminWrite(state, "post", "/auth/login")).toBe(false);
    expect(demoBlocksAdminWrite(state, "post", "/cart/items")).toBe(false);
    expect(demoBlocksAdminWrite(state, "post", "/orders")).toBe(false);
  });

  it("keeps full write access for a signed-in admin during demo", () => {
    const state = { demoMode: true, adminWriteAllowed: true };
    expect(demoBlocksAdminWrite(state, "post", "/admin/products")).toBe(false);
    expect(demoBlocksAdminWrite(state, "delete", "/admin/reviews/r_1")).toBe(
      false,
    );
  });

  it("treats a missing method or URL conservatively", () => {
    const state = { demoMode: true, adminWriteAllowed: false };
    expect(demoBlocksAdminWrite(state, undefined, undefined)).toBe(false);
    expect(demoBlocksAdminWrite(state, "post", undefined)).toBe(false);
  });
});

describe("isAdminWriteBlocked (runtime state)", () => {
  afterEach(() => {
    setAdminWriteAllowed(!DEMO_MODE);
  });

  it("mirrors the pure decision with the module-level allowlist", () => {
    setAdminWriteAllowed(false);
    if (DEMO_MODE) {
      expect(isAdminWriteBlocked("post", "/admin/products")).toBe(true);
    } else {
      expect(isAdminWriteBlocked("post", "/admin/products")).toBe(false);
    }
    setAdminWriteAllowed(true);
    expect(isAdminWriteBlocked("post", "/admin/products")).toBe(false);
  });
});

describe("demoSessionOverrides", () => {
  it("does not elevate anyone outside demo mode", () => {
    expect(demoSessionOverrides(false, false)).toEqual({
      isAdmin: false,
      isSuperAdmin: false,
      readOnly: false,
    });
    expect(demoSessionOverrides(false, true)).toEqual({
      isAdmin: false,
      isSuperAdmin: false,
      readOnly: false,
    });
  });

  it("treats demo visitors as admin/super-admin but read-only", () => {
    expect(demoSessionOverrides(true, false)).toEqual({
      isAdmin: true,
      isSuperAdmin: true,
      readOnly: true,
    });
  });

  it("keeps signed-in admins fully interactive in demo mode", () => {
    expect(demoSessionOverrides(true, true)).toEqual({
      isAdmin: true,
      isSuperAdmin: true,
      readOnly: false,
    });
  });
});
