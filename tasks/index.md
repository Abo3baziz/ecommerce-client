# Frontend Build — Task Index

Master plan for the Ecommerce Storefront & Admin Console frontend, derived from
`FRONTEND_PROMPT.md` (this repo) and the backend API docs.

**Backend repo (read-only source of truth):** `D:\code\ecommerce`
- `docs/API_ENDPOINTS.md` — full endpoint reference (verified to match prompt §3)
- `docs/api/**` — per-module contracts (cite in each task)
- `docs/adr/0001-imagekit-client-side-signed-upload.md` — upload widget flow

**Backend must NOT be modified.**

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript strict (`no any`, no non-null assertions on API data) |
| Routing | App Router file routes; route groups `(storefront)` / `(auth)` / `admin` |
| Server state | TanStack Query v5 (cache keyed by full query params; never mirror into local stores) |
| HTTP | Axios instance, `withCredentials: true` (session-cookie auth), CSRF interceptor |
| Forms | Zod schemas mirroring server constraints (prompt §3.6) |
| UI | Tailwind CSS + shadcn/ui, lucide-react |
| Client UI state | Zustand only where needed (cart drawer/toast state) |
| Data fetching | 100% client components ("use client") + Axios — cookies/CORS behave as the SPA design intends |

**Environment:** `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`

CORS-with-credentials is enabled for exactly one origin. Locally either run Next on that
origin or use a Next.js `rewrites()` proxy. In production the SPA origin and API must be
same-site (cookies are `SameSite=Lax`) — same-origin reverse proxy recommended.

## Execution order & dependencies

```
T00 ─► T01 ─► T02 ─► T03 ─► T04 ─► T06 ─┬─► T07 ─► (auth flows usable)
                        │               ├─► T08 ─► T09 ─► T10   (catalog)
                        │               ├─► T11 ─► T12           (cart/orders)
                        │               └─► T13 ─► T14           (account)
                        └─► T05 ────────┬─► T15                  (admin products)
                                        ├─► T16                  (admin cat/inv)
                                        └─► T17                  (admin ord/rev/usr)
T18 last (depends on everything)
System epic: T31 ─► T32 ─► (T33‖T34‖T35‖T36‖T37‖T38‖T39‖T40) after backend T-100..T-104
```

Infra chain T00→T06 is strictly sequential. After T07 the storefront, account, and admin
tracks can proceed in parallel; admin tasks additionally need T05 (ImageKit) and T02/T03.

## Status

| Task | File | Scope | Status |
| --- | --- | --- | --- |
| T00 | [T00-project-setup.md](T00-project-setup.md) | Next.js scaffold, deps, env, folder conventions | ✅ done |
| T01 | [T01-api-types.md](T01-api-types.md) | Hand-written API types from backend docs | ✅ done |
| T02 | [T02-api-client.md](T02-api-client.md) | Axios client, CSRF interceptor, error normalizer | ✅ done |
| T03 | [T03-session-guards.md](T03-session-guards.md) | Session provider, role helpers, route guards | ✅ done |
| T04 | [T04-shared-ui.md](T04-shared-ui.md) | Pagination/Money/Badge/Rating/states/dialogs/toasts | ✅ done |
| T05 | [T05-imagekit-upload.md](T05-imagekit-upload.md) | Signed direct-to-ImageKit upload widget | ✅ done |
| T06 | [T06-layout-shell.md](T06-layout-shell.md) | Storefront header/footer + admin sidebar shell | ✅ done |
| T07 | [T07-auth-pages.md](T07-auth-pages.md) | Register/Login/logout + verify-email landings | ✅ done |
| T08 | [T08-catalog.md](T08-catalog.md) | Home, product listing, category pages | ✅ done |
| T09 | [T09-product-detail.md](T09-product-detail.md) | PDP gallery, variant picker, add-to-cart | ✅ done |
| T10 | [T10-product-reviews.md](T10-product-reviews.md) | PDP reviews, write review, deep link | ✅ done |
| T11 | [T11-cart-checkout.md](T11-cart-checkout.md) | Cart page + checkout wizard → POST /orders | ✅ done |
| T12 | [T12-orders.md](T12-orders.md) | Order history + detail/timeline/snapshots | ✅ done |
| T13 | [T13-account-security.md](T13-account-security.md) | Profile/password/email/phone/delete account | ✅ done |
| T14 | [T14-account-addresses-sessions.md](T14-account-addresses-sessions.md) | Address book, My reviews, sessions | ✅ done |
| T15 | [T15-admin-products.md](T15-admin-products.md) | Admin dashboard + products editor tabs | ✅ done |
| T16 | [T16-admin-categories-inventory.md](T16-admin-categories-inventory.md) | Categories CRUD, inventory dashboard | ✅ done |
| T17 | [T17-admin-orders-reviews-users.md](T17-admin-orders-reviews-users.md) | Orders transitions, moderation, customers | ✅ done |
| T18 | [T18-quality-polish.md](T18-quality-polish.md) | Quality bar audit + endpoint coverage check | ✅ done |
| T19 | [T19-paymob-checkout.md](T19-paymob-checkout.md) | Paymob checkout flow (Unified Checkout redirect, result page, pending states) | 🚫 won't do |
| T20 | [T20-admin-dashboard-stats.md](T20-admin-dashboard-stats.md) | Admin dashboard statistics (backend `/admin/stats` aggregate + recharts dashboard) | ✅ done |
| T21 | [T21-manage-reserve-quantity.md](T21-manage-reserve-quantity.md) | Manual reserve/release per variant (guarded backend endpoint + shared dialog) | ✅ done |
| T22 | [T22-admin-audit-logging.md](T22-admin-audit-logging.md) | Append-only admin audit trail (auto-middleware + auth events, super-admin viewer) | ✅ done |
| T23 | [T23-password-reset-otp.md](T23-password-reset-otp.md) | Password reset via emailed OTP + link fallback (wizard `/forgot-password`, backend OTP verify) | ✅ done |
| T24 | [T24-tooltip-icon-buttons.md](T24-tooltip-icon-buttons.md) | Hover labels for all icon-only buttons (shadcn tooltip + shared wrapper) | ✅ done |
| T25 | [T25-analytics-section.md](T25-analytics-section.md) | Analytics section: P&L, expenses ledger, product/customer insights (SUPER_ADMIN only) | ✅ done |
| T29 | [T29-csrf-env-toggle.md](T29-csrf-env-toggle.md) | Environment-based CSRF toggle (`ENABLE_CSRF`, default true, prod boot guard) | ✅ done |
| T26 | [T26-coupon-management.md](T26-coupon-management.md) | Coupon management section + audit integration (CRUD, soft delete, usage drawer, tx audits) | ✅ done |
| T27 | [T27-coupon-analytics.md](T27-coupon-analytics.md) | Coupon insights inside Analytics (status counts, trends, most-used, revenue impact) | ✅ done |
| T28 | [T28-admin-management.md](T28-admin-management.md) | Admin Management section (super-admin admin accounts + activity monitoring) | ✅ done |
| T30 | [T30-imagekit-upload-hardening.md](T30-imagekit-upload-hardening.md) | ImageKit upload hardening: folders, save-time URL validation, review audit edges | ✅ done |
| T31 | [T31-system-sidebar.md](T31-system-sidebar.md) | System sidebar “System” section (SUPER_ADMIN, 9 items) | done |
| T32 | [T32-system-settings-api.md](T32-system-settings-api.md) | System settings API layer (types, client, query keys) | done |
| T33 | [T33-system-general.md](T33-system-general.md) | System: General Settings page (12 fields, maintenance) | done |
| T34 | [T34-system-commerce.md](T34-system-commerce.md) | System: Commerce Settings page (tax, limits, guest rules) | done |
| T35 | [T35-system-payment.md](T35-system-payment.md) | System: Payment Settings page (masked secrets) | done |
| T36 | [T36-system-shipping.md](T36-system-shipping.md) | System: Shipping Settings page (zones, rates) | done |
| T37 | [T37-system-email.md](T37-system-email.md) | System: Email & Notifications page (11 toggles, test email) | done |
| T38 | [T38-system-customer.md](T38-system-customer.md) | System: Customer Settings page (10 fields) | done |
| T39 | [T39-system-security.md](T39-system-security.md) | System: Security page (overview + policies) | done |
| T40 | [T40-system-admins-financial.md](T40-system-admins-financial.md) | System: Admin & Permissions + Financial pages | done |

## Definition of Done (applies to every task)

Per prompt §11: loading skeleton + empty state + error state w/ retry on every list;
debounced search 300ms; filters preserved in URL; optimistic mutations with rollback where
safe; destructive actions behind confirm dialogs; Zod inline field errors with server
422/409 mapping; labeled inputs + keyboard-navigable dialogs + visible focus rings;
mobile-first storefront, admin usable ≥1024px; user content rendered as text never HTML;
TypeScript strict end-to-end.

Out of scope everywhere (prompt §12): password-reset screens, wishlist, loyalty,
recommendations, real payment gateways (only `mock`), webhooks/streaming.

> **Update (2026-08-22):** real payment gateways were scoped in via Paymob
> (see [T19](T19-paymob-checkout.md)) — **reversed 2026-08-25**: Paymob is
> out of scope again; T19 and backend T-081…T-087 are marked won't do /
> wontfix. Checkout stays on the `mock` provider.
