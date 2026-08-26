# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customers:** online shoppers browsing, filtering, and buying from a catalog; managing their account (addresses, orders, reviews, sessions). Arrive from search/direct links, often on mobile.
- **Store staff:** `admin` and `super_admin` roles operating the `/admin` console daily — catalog/inventory upkeep, order fulfillment against a legal status-transition matrix, review moderation, coupon management, and P&L analytics (super-admin).

## Product Purpose

A production-deployed ecommerce platform: customer storefront plus role-gated admin console, built as the frontend half of a full-stack system with a custom Express + Prisma/PostgreSQL API (86 REST endpoints, never modified). Success = every endpoint has a real UI surface, including the "boring" admin CRUD screens.

## Positioning

Full-stack engineering showcase by Ahmed Abdelaziz ([codebyahmed.online](https://codebyahmed.online)) — same-origin security architecture (first-party cookies, CSRF double-submit, zero tokens in JS), server-authoritative pricing with decimal-string money, and strict TypeScript end-to-end. A neighboring template could not claim the depth of the admin surface (audit trail, inventory reserve/release, transition-matrix order queue) or the production deployment chain (Vercel → Render → Neon).

## Operating Context

- Deployed: storefront at [ecommerce-storefront-ashy.vercel.app](https://ecommerce-storefront-ashy.vercel.app); API on Render; Neon Postgres.
- Local dev: backend owns port 3000; frontend runs `npm run dev` on 3001 proxying `/api/v1/*`.
- Backend repo: `D:\code\ecommerce` (separate; contracts in its `docs/api/**`).

## Capabilities and Constraints

- Storefront: catalog browse/search/filter/sort with URL-persisted state, product detail with variant picker + gallery, cart with merge-on-add, 3-step checkout, order history with status timeline, reviews (one per user/product, with images), account center (profile/password/email-OTP/phone-OTP/addresses/sessions/deletion).
- Admin: KPI dashboard, revenue trends, super-admin analytics (P&L, expenses, coupon insights), products/variants/images editor with direct-to-ImageKit signed uploads, categories CRUD, inventory dashboard, order queue with legal-transition matrix, customers, review moderation, coupons, append-only audit log.
- Binding technical constraints: Next.js App Router + React 19 + TS strict; Tailwind v4 CSS-first theme; shadcn/ui v4 primitives; TanStack Query for server state; Zustand UI-state only; money rendered via `<Money>` (decimal strings, never floats); paginated envelopes via `Paginated<T>`; all requests through shared Axios instance (CSRF automatic); routes `/verify-email` and `/verify-email-change` must keep existing (emailed links).
- Route guards in `src/components/guards.tsx`; admin status = probe pattern (`features/auth/session-context.tsx`).
- Open decision: store niche/product vertical is undefined — currently generic multi-category catalog with placeholder products.

## Brand Commitments

- Owner/portfolio identity: Ahmed Abdelaziz · codebyahmed.online (footer credit).
- No established logo, wordmark, voice guide, or palette commitments beyond the incumbent implementation.

## Evidence on Hand

- Live deployed storefront and API; full README architecture notes; authoritative spec in `FRONTEND_PROMPT.md` (§9–12 admin specs).
- Real seeded catalog data exists behind the dev backend (do not fabricate product claims).

## Product Principles

1. Server truth wins — never fake states the API doesn't grant; authorization is always re-enforced server-side.
2. Every screen is real — no dead buttons, no mock data; boring CRUD gets full craft.
3. Money and identity are sacred — decimal strings via `<Money>`, cookies first-party, tokens never in JS.
4. Depth is the differentiator — the admin console's operational rigor is the showcase, not a footnote.
5. Production-deployed means production-grade — errors, empties, loading, 429s, and 403s are designed states, not afterthoughts.

## Accessibility & Inclusion

- Standard web accessibility expected of a production shadcn/ui build (keyboard operability, focus management, semantic landmarks); no audited WCAG target recorded yet.
