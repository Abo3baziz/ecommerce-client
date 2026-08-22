# T00 — Project Setup

## Goal
Scaffold the Next.js App Router codebase with the prescriptive stack, strict TypeScript,
and folder conventions everything else builds on.

## Dependencies
None (first task).

## Steps

1. **Scaffold Next.js** (App Router, TypeScript, Tailwind, ESLint, no `src` default is
   fine — but this plan assumes `src/`; enable it). Repo root contains a space
   (`client for ecommerce`) which is an invalid npm name: run
   `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir`
   and if it rejects the folder name, scaffold into a temp subdir and move contents up,
   or hand-write `package.json`/configs. Set package name to something valid.
2. **Install deps**
   - `@tanstack/react-query` v5
   - `axios`, `zod`, `zustand`, `lucide-react`
   - shadcn/ui CLI init (`components/ui`), add primitives as needed in later tasks
3. **TypeScript strict**: ensure `"strict": true`; add `noUncheckedIndexedAccess`.
   Project rule: **no `any`**, no non-null assertions on API data (prompt §2).
4. **Environment**: `.env.local` with
   `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`.
5. **Providers** (`src/app/providers.tsx`, "use client"): mount `QueryClientProvider`
   with a browser-only `QueryClient` (sensible defaults finalized in T02). Wire into root
   layout. Add a `<Toaster>` placeholder (finalized T04).
6. **Route groups / skeleton layouts** (empty shells now):
   ```
   src/app/(storefront)/layout.tsx    ← catalog, cart, checkout, orders, account
   src/app/(auth)/login/page.tsx      ← minimal centered layout
   src/app/(auth)/register/page.tsx
   src/app/admin/layout.tsx           ← admin shell placeholder
   ```
7. **Folder conventions**
   ```
   src/lib/api/        client.ts, csrf.ts, queryKeys.ts (T02)
   src/types/          api types (T01)
   src/features/<domain>/  api hooks + components per domain
   src/components/shared/ shared UI (T04)
   src/stores/         zustand UI stores
   ```
8. **Dev proxy decision** (document in README): backend CORS allows one origin with
   credentials. Either run `next dev` on the CORS origin port, or add
   `async rewrites()` proxying `/api/v1/:path*` → `${API_ORIGIN}/api/v1/:path*`. Note:
   production must be same-site because cookies are `SameSite=Lax`.

## Acceptance criteria
- [ ] `npm run build` green with strict TS; lint clean; zero `any`
- [ ] Root page renders inside `(storefront)` layout; providers mounted once
- [ ] Env var typed via `src/env.ts` or `process.env` guard
