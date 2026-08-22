# AGENTS.md

Compact guidance for coding agents. See `README.md` for setup and `FRONTEND_PROMPT.md` for
the product spec (§9–12 admin specs + out-of-scope list are authoritative).

## Commands

```bash
npm run lint        # plain "eslint" — no dir args, config in eslint.config.mjs
npm run typecheck   # tsc --noEmit (always run after changes)
npm test            # vitest run; only src/**/*.test.ts, node environment
npm run dev         # port 3001 (backend owns 3000); proxies /api/v1/* to API_ORIGIN
```

Verify with lint → typecheck → test. No CI exists in this repo.

## Backend coupling

- The API lives in a separate repo: `D:\code\ecommerce` (Express + Prisma/Postgres). This
  repo cannot run meaningfully without it (`npm run dev` there first).
- Changing an API contract means editing both repos; backend contracts are documented in
  its `docs/api/**` and drift from real controllers is possible — trust the controller.
- **Never run `npm test` in the backend repo against local dev DB**: its integration suite
  `deleteMany`s catalog data on the shared dev schema (see backend `tasks/T-032`). Verify
  backend changes via typecheck or read-only scripts instead.
- Backend emails link to `/verify-email?token=` and `/verify-email-change?token=` — these
  routes MUST keep existing here.

## API client quirks

- List endpoints return paginated envelopes. `unwrap()` in `src/lib/api/client.ts`
  deliberately preserves `{ data, pagination }` for any response carrying top-level
  `pagination`. Typing such a call as bare `T[]` compiles fine and explodes at runtime
  ("not iterable") — always use `Paginated<T>` and read `.data`.
  (Bug fixed in commit 76a6de0; don't reintroduce.)
- CSRF + cookie session handling is automatic inside `src/lib/api/axios-instance.ts`;
  never call axios directly.
- Money is decimal-as-string end-to-end; render via `<Money>`, never parse to float.

## Auth / roles

- Session payloads expose no role. Admin status = probe of `GET /admin/products` in
  `src/features/auth/session-context.tsx`. Super-admin-only UI needs its own probe
  (e.g. hit the super-admin-only endpoint and check 200 vs 403); the backend always
  enforces real authorization.
- Route groups: `(storefront)` customer-facing, `(admin)` console, `(auth)`/`(landing)`
  public. Guards live in `src/components/guards.tsx`.

## Git commits

- Conventional format, matching repo history: `feat(scope): …`, `fix(scope): …`,
  `docs: …`, `chore: …`. Summary line imperative, ≤72 chars.
- **Self-contained messages**: reading only the summary + body (no diff, no code) must
  tell someone what changed, where, and why. Write for a teammate reviewing history
  months later.
- Every commit must have a body with bullet points summarizing what changed and why —
  not just a subject line. One bullet per logical change (files/features), plus any
  migration/contract notes. Bullets name concrete files/endpoints/behaviors ("add
  GET /admin/stats + useAdminStats hook"), never vague placeholders ("update code",
  "misc fixes"). Example:

  ```
  feat(admin): T20 statistics dashboard

  - add GET /admin/stats consumer + useAdminStats hook (replaces quick-counts)
  - rebuild /admin: KPI row, revenue trend chart, status pipeline links
  - add recharts dep + shadcn chart wrapper
  ```

- Split unrelated work into separate commits (see history: fixes vs features vs docs).
- Stage only intended files; never commit `.env*`, secrets, or build output.

## Task workflow

- Work is tracked as `tasks/T##-*.md` files + status table in `tasks/index.md`; follow
  that convention for new tasks (Goal / decisions / contract / AC checklist) and update
  statuses when done.
- Each task's Definition of Done lives at the bottom of `tasks/index.md` (skeletons,
  empty/error states, URL-persisted filters, confirm dialogs, Zod inline errors, …).

## UI conventions

- shadcn/ui v4 + Tailwind v4 (CSS-first theme in `src/app/globals.css`, `@theme inline`).
  Add primitives via `npx shadcn@latest add <name>` — they land in `src/components/ui`.
- Fonts come from `next/font/google` in `src/app/layout.tsx` and must stay wired into the
  theme vars in `globals.css` (a circular `--font-sans: var(--font-sans)` once silently
  disabled them — browser fell back to serif).
- Admin order status actions encode the legal transition matrix
  (`features/admin/order-components/order-status-actions.tsx`) — render only legal next
  steps; transitions have server-side stock/payment side effects.
