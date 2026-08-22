# Ecommerce Storefront & Admin Console

Frontend for the Ecommerce Backend API. Built per `FRONTEND_PROMPT.md`; task breakdown
lives in [`tasks/index.md`](tasks/index.md).

## Stack

Next.js (App Router) · TypeScript strict · TanStack Query v5 · Axios (cookie auth +
CSRF) · Zod · Tailwind CSS v4 + shadcn/ui · lucide-react · Zustand (UI state only)

## Development

```bash
npm install
npm run dev        # runs on http://localhost:3001
npm run lint
npm run build
```

The backend must be running (default `http://localhost:3000`, repo at `D:\code\ecommerce`).

### API connectivity

`.env.local`:

- `NEXT_PUBLIC_API_BASE_URL=/api/v1` — browser calls are **same-origin**; `next.config.ts`
  rewrites proxy `/api/v1/*` to `API_ORIGIN` (default `http://localhost:3000`).
  This avoids CORS entirely and keeps session cookies first-party.
- Port is `3001` because the backend occupies `3000`.

Production must serve the app and API same-site (cookies are `SameSite=Lax`) — put both
behind one origin/reverse proxy, or set the backend `CORS_ORIGIN` to the app origin and
point `NEXT_PUBLIC_API_BASE_URL` at the absolute API URL.

## Structure

```
src/app/(storefront)/   catalog, cart, checkout, orders, account
src/app/(auth)/         login, register
src/app/admin/          admin console (role-gated)
src/components/ui/      shadcn primitives
src/components/shared/  shared UI kit (T04)
src/features/<domain>/  api hooks + components per domain
src/lib/api/            axios client, CSRF store, query keys (T02)
src/types/              hand-written API types (T01)
```

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess`; no `any`; no non-null assertions on API data
- Money values are decimal strings — format for display, never float math
- Public IDs only (`prd_…`, `ord_…`, …)
- Plain `<img loading="lazy">` is used instead of `next/image` because image hosts are
  arbitrary (ImageKit CDN + user-submitted URLs); the `@next/next/no-img-element` rule is
  disabled in `eslint.config.mjs` for this reason
