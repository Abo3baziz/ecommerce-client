# Ecommerce Storefront & Admin Console

A production-deployed e-commerce platform — customer storefront and role-gated
admin console — built as the frontend half of a full-stack system with a
custom Express + Prisma/PostgreSQL API.

**Part of a full-stack app** · [View Portfolio](https://codebyahmed.online)

| | |
|---|---|
| **Storefront** | [ecommerce-storefront-ashy.vercel.app](https://ecommerce-storefront-ashy.vercel.app) |
| **API repo** | [github.com/Abo3baziz/ecommerce-api](https://github.com/Abo3baziz/ecommerce-api) |
| **Portfolio** | [codebyahmed.online](https://codebyahmed.online) |

## What it does

**Customer experience**

- Catalog browsing with URL-persisted search/filter/sort, category pages, and a
  product detail page with variant picker (color/size) and image gallery
- Cart with merge-on-add quantities and live server-side pricing
- Three-step checkout wizard → order placement → order history with status
  timeline and immutable price snapshots
- Product reviews with images, one-per-user-per-product, rating summaries
- Account center: profile, password change, email change (emailed verification),
  phone change (OTP), address book with per-type defaults, session management,
  account deletion
- Email verification + password reset via emailed OTP

**Admin console** (`/admin`, role-gated)

- Dashboard KPIs, revenue trends, and a super-admin analytics section
  (P&L, expenses ledger, coupon insights)
- Products editor: products, variants, images with signed direct-to-ImageKit
  uploads (private key never touches the browser)
- Categories CRUD, inventory dashboard with manual reserve/release
- Order queue enforcing a legal status-transition matrix with transactional
  stock/payment side effects
- Customer accounts, review moderation, coupon management, append-only audit
  trail

## Architecture highlights

- **Same-origin by design** — the browser only ever talks to `/api/v1/*`;
  Next.js rewrites proxy to the API host. Session cookies stay first-party
  (`HttpOnly` / `SameSite=Lax`), no tokens in JavaScript, no CORS in play.
- **CSRF double-submit** wired into every cookie-authenticated write via a
  shared Axios instance.
- **Server state discipline** — TanStack Query caches keyed by full query
  params; Zustand reserved for pure UI state (drawers/toasts).
- **Money is decimal strings end-to-end** — rendered via a `<Money>`
  component, never parsed to float; prices are recomputed and frozen
  server-side at checkout.
- **TypeScript strict everywhere**, Zod schemas mirroring server validation
  for inline field errors with 422/409 mapping.

## Tech stack

| Layer | Tools |
|---|---|
| Framework | Next.js (App Router), React 19, TypeScript strict |
| Server state | TanStack Query v5, Axios |
| UI | Tailwind CSS v4, shadcn/ui, lucide-react, recharts |
| Forms | react-hook-form + Zod |
| Client state | Zustand (UI state only) |

## Local development

```bash
npm install
npm run dev        # http://localhost:3001 — backend owns 3000
npm run lint
npm test           # vitest
npm run typecheck
```

Requires the backend running locally ([ecommerce-api](https://github.com/Abo3baziz/ecommerce-api)).
`.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=/api/v1   # keep relative — same-origin cookies
API_ORIGIN=http://localhost:3000   # rewrite proxy target
```

## Deployment

Vercel (storefront) → same-origin rewrite proxy → Render (API) → Neon
PostgreSQL. Pushes to `main` auto-deploy. Full backend runbook:
[`docs/DEPLOYMENT.md` §7](https://github.com/Abo3baziz/ecommerce-api/blob/main/docs/DEPLOYMENT.md).

---

© Ahmed Abdelaziz · [Portfolio](https://codebyahmed.online)
