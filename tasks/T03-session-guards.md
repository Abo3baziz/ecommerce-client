# T03 — Session Provider & Route Guards

## Goal
Hydrate the current user from the session cookie and gate routes by auth state/role.
No tokens in JS — everything rides the HttpOnly cookie.

## Dependencies
T00, T01, T02.

## Reference
`docs/api/authentication/session-management.md` (exact `GET /auth/session` shape),
`AUTHENTICATION.md` (roles: CUSTOMER/ADMIN/SUPER_ADMIN).

## Session provider (`src/features/auth/session-provider.tsx`)
- "use client" context mounted in root layout; `useQuery(['session'])` →
  `GET /auth/session` → `{ authenticated, user?, session: { expiry } }`.
- Exposes `useSession()`: `{ user, role, isAdmin, isSuperAdmin, isLoading, refresh }`.
- Subscribes to T02's `session:expired` event → clears session query + invalidates all.
- Persistent **verify-your-email banner** rendered on storefront pages when
  `user && !user.email_verified` (dismissable per-page, reappears until verified).

## Guards (`src/components/guards.tsx`)
| Guard | Rule |
| --- | --- |
| `<AuthGate>` | Unauthenticated → redirect `/login?from=<current>`; loading skeleton while hydrating |
| `<PublicOnlyGate>` | login/register only — authed users redirect home (or `from`) |
| `<AdminGate>` | Requires ADMIN/SUPER_ADMIN; customer → friendly forbidden state (403 semantics), unauthenticated → login redirect |
| `<SuperAdminGate>` | SUPER_ADMIN only (role management) |

Implementation notes:
- Wrap layouts (`(storefront)/account/layout.tsx`, `admin/layout.tsx`, `(auth)` pages)
  so guards are declared once per segment, not per page.
- Preserve deep links via `?from=` param through login.

## Logout util (`src/features/auth/logout.ts`)
`DELETE /auth/session` with CSRF header → clear csrf token store → `queryClient.clear()`
→ `router.push('/')`. Used by header account menu and account pages.

## Acceptance criteria
- [ ] Anonymous hitting `/account` or any admin route → login redirect w/ `from`
- [ ] CUSTOMER hitting `/admin` → forbidden UI, admin nav never rendered for them
- [ ] ADMIN sees console; SUPER_ADMIN-only surfaces hidden from ADMIN (role page in T17)
- [ ] Session expiry event logs user out cleanly without stale cached data
