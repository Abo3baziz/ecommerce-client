/**
 * Public demo mode (recruiter showcase) — client-side flags and guards.
 *
 * Enabled at build time via NEXT_PUBLIC_DEMO_MODE="true" and paired with the
 * backend's ENABLE_DEMO_MODE (see backend middleware/demoMode.ts). The backend
 * is the source of truth for enforcement: it rejects every unauthenticated
 * /admin/* write and masks customer PII in demo responses. This module only
 * shapes the UI (read-only presentation) and adds a client-side hard block so
 * demo visitors never even issue a mutating /admin/* request.
 *
 * Real signed-in admins keep full write access while the flag is on.
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const WRITE_METHODS = new Set(["post", "patch", "put", "delete"]);

/** Pure decision used by the axios request interceptor. */
export function demoBlocksAdminWrite(
  state: { demoMode: boolean; adminWriteAllowed: boolean },
  method?: string,
  url?: string,
): boolean {
  if (!state.demoMode || state.adminWriteAllowed) {
    return false;
  }
  if (!WRITE_METHODS.has((method ?? "get").toLowerCase())) {
    return false;
  }
  return isAdminUrl(url);
}

function isAdminUrl(url?: string): boolean {
  if (!url) {
    return false;
  }
  const path = url.split("?")[0] ?? url;
  return path === "/admin" || path.startsWith("/admin/");
}

/**
 * Runtime write-allowance for the current browser session. Demo visitors
 * (no authenticated user) are blocked from /admin writes; a signed-in admin
 * session re-enables them without a rebuild.
 */
let adminWriteAllowed = !DEMO_MODE;

export function setAdminWriteAllowed(allowed: boolean): void {
  if (!DEMO_MODE) {
    return;
  }
  adminWriteAllowed = allowed;
}

export function isAdminWriteBlocked(method?: string, url?: string): boolean {
  return demoBlocksAdminWrite(
    { demoMode: DEMO_MODE, adminWriteAllowed },
    method,
    url,
  );
}

/**
 * Session-context mapping for demo mode. In demo, the admin probe is skipped
 * and every visitor is treated as admin/super-admin for UI visibility (the
 * backend independently enforces authorization). Signed-in real users are not
 * read-only; anonymous visitors are.
 */
export function demoSessionOverrides(
  demoMode: boolean,
  hasUser: boolean,
): { isAdmin: boolean; isSuperAdmin: boolean; readOnly: boolean } {
  if (!demoMode) {
    return { isAdmin: false, isSuperAdmin: false, readOnly: false };
  }
  return { isAdmin: true, isSuperAdmin: true, readOnly: !hasUser };
}
