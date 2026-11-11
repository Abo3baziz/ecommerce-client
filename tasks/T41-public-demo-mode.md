# T41 — Public read-only demo mode (recruiter showcase)

**Status:** done
**Pair:** backend T-108 (`D:\code\ecommerce`, `feature/public-demo-mode`) — the
backend is the source of truth for enforcement.

## Goal

Recruiters open `/admin` directly, without signing in, and explore the real
console against real seeded data. Every mutation is impossible.

## Design decisions

- **Build-time flag** `NEXT_PUBLIC_DEMO_MODE=true` (inlined by Next; see
  `.env.example`). Paired with backend `ENABLE_DEMO_MODE=true` on the demo
  deployment. Default off → zero behavior change.
- **Session mapping** (`src/lib/demo.ts` `demoSessionOverrides`): in demo mode
  the admin/super-admin probes are skipped and the UI treats every visitor as
  admin (the backend independently enforces authorization). A signed-in real
  admin is not read-only; anonymous visitors are (`isReadOnlyDemo`).
- **Client-side hard block**: axios request interceptor rejects mutating
  `/admin/*` requests with a normalized `403 DEMO_READ_ONLY` error before any
  network round-trip, driven by a runtime write-allowlist that the session
  provider toggles on the user's presence (`setAdminWriteAllowed`). Auth and
  storefront flows are untouched, so real admins/staff keep full access.
- **UI in demo mode**: persistent "Demo mode — read-only" banner + sidebar
  badge; account menu (sign-in/out) hidden in the admin shell; storefront
  header shows an "Admin dashboard" shortcut button beside Sign in / Register
  for anonymous demo visitors (account-menu.tsx, isReadOnlyDemo-driven); private
  super-admin sections (System settings ×9, Admins, Audit log) hidden from the
  nav and deep-linking to a "not available in demo" card (backend rejects them
  outright); mutation triggers hidden across all admin surfaces:
  products (create/details save/danger zone, variants, product + variant
  images), categories (create/edit/delete/assign/visibility toggle — rendered
  as read-only text), inventory (create/adjust/reserve), orders (status
  transition panel replaced with a read-only note — transitions have
  stock/payment side effects), reviews (approve/edit/delete), customers
  (edit/role/suspend/activate), coupons (create/edit/delete/active toggle),
  analytics expenses (add/edit/delete).
- Storefront and auth pages unchanged.

## Files

- `src/lib/demo.ts` (+ `src/lib/demo.test.ts`) — flags, pure write-guard
  decision, demo session mapping.
- `src/lib/api/client.ts` — axios request interceptor demo block.
- `src/features/auth/session-context.tsx` — demo overrides, `isReadOnlyDemo`,
  write-allowlist wiring.
- `src/components/guards.tsx` — `AdminGate` demo passthrough.
- `src/components/layout/demo-banner.tsx` (new) + `src/app/admin/layout.tsx`.
- `src/components/layout/admin-sidebar.tsx` — demo badge, hidden account menu,
  hidden private sections.
- 11 private pages gated (`settings/*`, `admins`, `audit`) with a demo card.
- Mutation-trigger hiding across the admin surfaces listed above.

## Contract notes

- The client never trusts itself: even if the flag is off in the client but on
  in the backend (or vice versa), the backend middleware enforces read-only
  (`403`) and the UI degrades gracefully (error/forbidden states).

## Verification

- `npm run lint` — clean except pre-existing errors in untracked
  `server-wake-modal.tsx` / `test-home.js`.
- `npm run typecheck` — green.
- `npm test` — 45 tests green, incl. 9 new `src/lib/demo.test.ts` tests
  (write-guard decision for all methods/URLs, auth/storefront exemption,
  signed-in-admin exemption, runtime allowlist, demo session mapping).
