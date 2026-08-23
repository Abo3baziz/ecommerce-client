# Frontend Build Prompt — Ecommerce Storefront & Admin Console

> Copy this entire document into any AI coding agent (Cursor, Claude Code, v0, Lovable, etc.) as the master prompt for building the frontend of the Ecommerce Backend API.
> Source of truth for the API contract: `docs/API_ENDPOINTS.md`, `docs/api/**`, `docs/api/authentication/csrf.md`.

---

## 1. Mission

Build a production-quality, API-only **frontend** for an existing ecommerce backend. The backend is complete (86 implemented REST endpoints) and must not be modified. The frontend consists of two applications in one codebase:

1. **Storefront** — what customers use to browse, buy, and manage their account.
2. **Admin Console** — what staff (`admin` / `super_admin` roles) use to manage catalog, inventory, orders, reviews, and customers.

Every endpoint listed in Section 9 must have a UI surface. Do not skip "boring" admin CRUD screens — they are the point of this build.

## 2. Tech Stack (prescriptive)

- **React 18 + TypeScript (strict)** — no `any`, no non-null assertions on API data.
- **Vite** SPA with **React Router** (routes below). If your tool builds Next.js instead, adapt routing but keep all pages/behaviors.
- **TanStack Query v5** for server state (caching, retries, invalidation). Never mirror server state into local stores.
- **Axios** instance configured with `withCredentials: true` (cookie-based auth).
- **Zod** for client-side form validation mirroring the server constraints in Section 3.
- **Tailwind CSS + shadcn/ui** component style, **lucide-react** icons.
- State library only where needed (e.g., Zustand for cart drawer/UI state) — server state lives in TanStack Query.

### Environment

```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

The backend enables CORS **with credentials** for exactly one origin (`CORS_ORIGIN`). In development either run the SPA on that origin or configure a dev proxy. All requests go to `${VITE_API_BASE_URL}/...`.

## 3. API Integration Fundamentals (read carefully — most bugs come from these)

### 3.1 Authentication model

- **Session-cookie based.** Login/register set an `HttpOnly` `session` cookie (`Set-Cookie`). JavaScript never sees or stores tokens. Every request must send cookies (`withCredentials`).
- There is **no bearer token**, no JWT, no client session storage.

### 3.2 CSRF (Double Submit Cookie)

1. After every login/register (new session), call `GET /auth/csrf-token`. Response body: `{ success: true, data: { csrf_token: "..." } }`.
2. Attach that value as the **`x-csrf-token` header** on **every authenticated write** (`POST/PATCH/PUT/DELETE` while logged in), including logout and admin operations.
3. On a 403 "Invalid CSRF token", refetch the token once and retry; if it still fails, surface the error.
4. Public unauthenticated writes (`register`, `login`) need no CSRF header.

Build this into the shared Axios instance (a request interceptor that injects the stored token) rather than per-call.

### 3.3 Response envelopes (two shapes — support both)

| Family | Success shape |
| --- | --- |
| Auth, users, sessions | Bare object or bare array or `204 No Content` |
| Addresses, products, categories, cart, orders, reviews, inventory, admin | `{ success: true, data: ... }` (+ top-level `pagination` on lists) |

Error shapes:

- Products/categories/auth/users/admin products: `{ error: { code: "<ERROR_CODE>", message: "<message>" } }`
- Inventory/cart/orders/reviews/admin (most): `{ success: false, message: "<message>" }`

Write one normalizer that turns both into a typed `ApiError { status, code?, message }`.

### 3.4 Data conventions

- **Public IDs only**: `usr_ ses_ adr_ prd_ var_ pimg_ vimg_ cat_ crt_ ci_ ord_ oit_ pay_ shp_ rev_ rvimg_`. Never expect numeric IDs.
- **Money is decimal strings** (`"129.99"`). Format for display (e.g., `$129.99`); never run float math on them.
- Timestamps are ISO 8601 UTC strings.
- Standard pagination object: `{ page, limit, total, totalPages, hasNext, hasPrev }`; reviews use `{ page, limit, total, has_more }`. One `<Pagination>` component must handle both.
- Query params: `page` (1-based), `limit` (default 20, max 100 unless stated), `sort` with optional `-` descending prefix, `search`, plus module-specific filters.

### 3.5 Status handling map

- `401` → session missing/expired → clear cached user, redirect to login (except on public pages).
- `403` → insufficient role OR CSRF failure → show forbidden state; hide admin nav for plain users.
- `404` → not found / hidden-by-design (ownership ambiguity is deliberate: addresses, orders, reviews return 404 for other users' resources — always render a friendly "not found").
- `409` → conflicts (duplicate email/SKU/slug, empty cart, illegal order transition, oversell guard, last-admin demotion).
- `422` → validation failed → map field errors onto forms when available.
- `429` → rate limited → disable submit + countdown message (resend verification, password/email/phone changes).

### 3.6 Client-side validation rules (mirror of server)

- Password: min 8 chars incl. uppercase, lowercase, number, special character.
- Names: 1–100 chars. Phone numbers: E.164 (`+15551234567`). Address lines: `address_1` ≤ 255; `address_2` ≤ 255; label ≤ 50; zip ≤ 20.
- Product name ≤ 255; slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`; description ≤ 10000; brand ≤ 255. Variant SKU ≤ 80 unique; price decimal ≥ 0 (max 10 integer + 2 fraction digits); discount 0–100; weight/dims > 0.
- Cart quantity 1–999 (merge-on-add may exceed neither). Review rating 1–5; title ≤ 255; comment ≤ 5000; images max 5.
- Checkout notes ≤ 1000; carrier/tracking ≤ 100.

### 3.7 Enums (render as badges)

- Order status (lowercase): `pending confirmed processing shipped delivered cancelled returned refunded`
- Variant status (uppercase): `ACTIVE DRAFT INACTIVE ARCHIVED`
- Stock status: `IN_STOCK LOW_STOCK OUT_OF_STOCK`
- User role: `CUSTOMER ADMIN SUPER_ADMIN`; user status: `ACTIVE SUSPENDED DELETED`
- Payment method v1: `"mock"` only.

## 4. Shared Infrastructure (build first)

1. `apiClient` — Axios instance, cookie credentials, CSRF interceptor, error normalizer (3.2–3.5).
2. **Session provider** — hydrates via `GET /auth/session` (returns `authenticated`, minimal `user`, `session.expiry`); exposes user + role; `ADMIN`/`SUPER_ADMIN` see the Admin Console nav.
3. Route guards: public-only (login/register redirect when authed), authed-only, admin-only, super-admin-only (role change page).
4. `<Pagination>`, `<Money>`, `<StatusBadge>` (all enums), `<Rating>` display/input stars, `<EmptyState>`, `<ErrorState>` with retry.
5. **ImageKit upload widget** (admin): calls `GET /admin/products/uploads/imagekit-auth` → receives `{ token, expire, signature, publicKey, urlEndpoint }` → uploads the picked file directly to ImageKit client-side using those signed params → returns the resulting `image_url` to the form. Used by product images, variant images, and review photos (review photos are plain URL inputs — provide URL paste + upload helper).
6. Layout shell: storefront header (search box, categories menu, cart indicator with `items_count`, account menu) + footer; separate sidebar layout for `/admin`.

## 5. Routes Overview

```text
/                          Home (catalog)
/products                  Catalog listing
/categories/:id            Category detail + its products
/products/:productId       Product detail (+ reviews)
/cart                      Cart
/checkout                  Checkout
/orders                    Order history
/orders/:orderId           Order detail / confirmation
/account                   Profile
/account/password          Change password
/account/email             Change email
/account/phone             Change phone
/account/addresses         Address book
/account/reviews           My reviews
/account/sessions          Devices & sessions
/verify-email              Landing (?token=...)
/verify-email-change       Landing (?token=...)   [email-change verify]
 /login  /register  /forgot-password
 /admin                     Dashboard
 /admin/analytics           Analytics overview + expense ledger (SUPER_ADMIN only)
/admin/products            Product list + editor (tabs: details, variants, images)
/admin/categories          Categories + product assignment
/admin/inventory           Stock dashboard
/admin/coupons             Coupon management (list, CRUD, usage history)
/admin/orders              Orders dashboard + detail
/admin/reviews             Moderation queue
/admin/users               Customers + role management
```

Email links generated by the backend point at `/verify-email?token=…`, `/verify-email-change?token=…` — these routes MUST exist.

## 6. Storefront Specs

### 6.1 Catalog — `GET /products`
Grid/list of product cards (image = primary image, name, brand). Controls: `search` (debounced substring), `brand` filter, sort by `name | created_at | updated_at` with `-` desc toggle (default `-created_at`), pagination. Only products with ≥1 active variant are returned — no stock display here.

### 6.2 Category pages — `GET /categories`, `GET /categories/{id}`, `GET /categories/{id}/products`
Categories nav/footer listing (active only, sorted by `name`). Category detail shows description + `product_count` and embeds the paginated product grid (same controls as catalog).

### 6.3 Product detail — `GET /products/{product_public_id}`
- Image gallery from product `images` (respect `display_order`, mark `is_primary`).
- Variant picker grouped by `color` / `size` (either may be absent); selecting a variant updates price display: `price`, strikethrough when `discount_percentage > 0`, computed `final_price`, weight.
- Per-variant gallery swap from variant `images` when present.
- Quantity stepper (1–999) + **Add to cart** → `POST /cart/items { variant_public_id, quantity }` (merge semantics: adding again increments the line; response returns full cart — update cache, open mini-cart toast).
- Handle 404 ("not available") and 400 (invalid variant).
- Reviews section: summary (average_rating, total_count) + list with rating filter chips (1–5), sort (`-created_at`, `-rating`), pagination (`has_more` shape). Each review: customer_name, rating, title, comment, images grid, date. Deep-linkable single review route uses `GET /reviews/{review_public_id}`.
- **Write a review** (authed): star input, title, comment, up to 5 photo URLs. On 409 ("already reviewed") offer link to edit their review in Account → My reviews.

### 6.4 Cart — `GET /cart`, `PATCH|DELETE /cart/items/{variant_public_id}`, `DELETE /cart`
Table/cards of lines: image, name, color/size/SKU, unit `final_price` (with discount note), quantity stepper (absolute set via PATCH, debounce ~500ms), line_total, remove (DELETE line). Header stats: `items_count`, `total_quantity`, `subtotal`. Empty cart state (note: `GET /cart` 404s when no cart exists yet — render empty state, don't treat as error). "Clear cart" with confirm → `DELETE /cart`.

### 6.5 Checkout — `POST /orders`
Guard: authed + verified email + non-empty cart. Steps:
1. **Address** — radio list from `GET /users/me/addresses` (default shipping preselected) + inline create-address form (POST address).
2. **Payment** — method select with single option `mock` (label it clearly as test provider).
3. **Coupon** — optional `coupon_code` input (applied at order time; 409 surfaces coupon errors like invalid/expired/min-order).
4. **Notes** textarea (≤1000). Order summary: subtotal, discount_amount, shipping_fee, tax_amount, total_amount (flat shipping logic is server-side — display returned values).
Place order → success screen with the created order (`status: confirmed`), then redirect to order detail. Errors: 400 bad method/address format, 404 cart/address missing, 409 empty cart/unpurchasable line/insufficient stock/coupon issue — show actionable messages per case (e.g., stock conflict → link back to cart).

### 6.6 Orders — `GET /orders`, `GET /orders/{order_public_id}`
History: status filter tabs (all + each enum), sort (`placed_at`, `order_number`, `total_amount`), pagination; rows: order_number, status badge, placed_at, total_amount, item thumbnails. Detail: status timeline, items snapshot (name, sku, variant attrs, qty, unit price, subtotal), shipping-address snapshot card, payment card (status/provider/reference/amount), totals breakdown, notes. Immutable snapshots — render exactly what the API returns.

## 7. Auth Screens

- **Register** `POST /auth/register`: first/last name, phone (E.164), email, password (policy hint live). Auto-signs-in → redirect; show persistent "verify your email" banner until `email_verified`. Errors: 409 email/phone taken, 422 weak password.
- **Login** `POST /auth/login`: 401 generic "Invalid email or password" (never differentiate); 403 suspended-account message. On success fetch CSRF token, hydrate session, redirect (admin → console if intended).
- **Verify email landing** `/verify-email?token=` → auto-submits `POST /auth/email-verification/verify`; states: verifying / success / 404 unknown / 410 expired-used (with "resend" CTA that calls `POST /auth/email-verification/resend` — handles 202, 409 already-verified, 429 rate limit).
- **Logout** = `DELETE /auth/session` (CSRF header), then clear query cache.

## 8. Account Area (authed)

- **Profile** — view/edit first/last name (`GET`/`PATCH /users/me`).
- **Change password** — current + new + confirm (`PATCH /users/me/password`); 401 `INVALID_CURRENT_PASSWORD`, 422 policy, 429 limiter. Warn: other sessions are logged out.
- **Change email** — form new_email + password → `POST /users/me/email` (202 pending banner); user clicks emailed link → `/verify-email-change?token=` auto-posts `POST /users/me/email/verify` (200 applies change; 410 expired → re-request).
- **Change phone** — same pattern: `POST /users/me/phone-number` sends SMS OTP (dev: OTP logged server-side) → OTP entry modal → `POST /users/me/phone-number/verify` (422 wrong code, 429 attempts, 410 expired → resend).
- **Delete account** — danger zone; confirm dialog requires current password (`DELETE /users/me`), then hard logout + cleared cache.
- **Address book** — list/create/edit/delete (`adr_` endpoints). Fields: recipient_name, phone_number, label, country, state, city, address_1, address_2, zip_code; default shipping/billing toggles (setting true elsewhere auto-unsets others server-side — reflect fresh list after mutation).
- **My reviews** — `GET /users/me/reviews` (includes `is_approved`); edit (PATCH; replacing images replaces whole set), delete (confirm).
- **Devices & sessions** — `GET /auth/sessions`: device, ip_address, last_activity_at, current badge; revoke one (`DELETE /auth/sessions/{id}`), revoke all others (`DELETE /auth/sessions`). If revoked session was current → logout flow.

## 9. Admin Console Specs (role-gated)

### 9.1 Dashboard
Cards linking to each section + quick counts fetched from list endpoints (total counts from pagination metadata).

### 9.2 Products
- **List** `GET /admin/products`: search, brand, sort, `include_deleted` toggle (deleted rows shown dimmed), pagination. Create button → form (name, slug optional w/ auto-generate hint, description, brand; 409 `PRODUCT_SLUG_TAKEN`).
- **Editor** `GET /admin/products/{id}` (admin superset): tabs —
  - *Details*: PATCH name/slug/description/brand (null clears description/brand); soft-delete product (warns variants are soft-deleted too).
  - *Variants* `GET|POST .../variants`, `GET|PATCH|DELETE .../variants/{var}`: table + drawer form: sku*, barcode, color, size, price*, cost_price, discount_percentage, weight/length/width/height, status select (default ACTIVE; nullable clears). 409 `VARIANT_SKU_TAKEN`. Include-deleted + status filters + sort.
    - Nested *Variant images* manager: list ordered by display_order, add (URL/upload, alt_text, display_order default next), reorder via display_order edit, delete (hard). 409 `DISPLAY_ORDER_CONFLICT` surfaced.
  - *Images*: gallery manager — add via ImageKit widget (URL, alt_text, display_order, is_primary), edit (set primary demotes old primary; clearing primary on the only image → 400, disable the control), delete (hard; primary auto-promotes next).

### 9.3 Categories — `GET|POST /admin/categories`, `GET|PATCH|DELETE /admin/categories/{id}`, `PUT|DELETE /{cat}/products/{prd}`
Table: name, slug, `is_active` switch (toggles storefront visibility), product_count, include_deleted toggle, search/sort. Create/edit forms (slug optional/auto, description nullable, 409 `CATEGORY_SLUG_TAKEN`/`CATEGORY_NAME_TAKEN`). Delete warns links are removed. Detail drawer: assigned products list with searchable assign picker (PUT idempotent assign / DELETE remove).

### 9.4 Inventory — `GET|POST /admin/inventory`, `GET|PATCH /admin/inventory/{variant_public_id}`
Dashboard table: product_name, sku/barcode, on_hand, reserved, available, reorder_level, stock_status badge (`LOW_STOCK` amber, `OUT_OF_STOCK` red). Filters: search (sku/barcode/product), `stock_status`, include_deleted, sort (incl. `-last_stock_update`). Row actions:
- *Adjust* modal: choose mode — Set absolute quantity **or** Signed delta (mutually exclusive; enforce in UI), reorder_level (nullable), optional reason (≤255, audit-only text). Show computed preview; 409 "would drive stock below zero" → block negative outcomes client-side too.
- *Create record* for variants without inventory: variant picker + initial quantity_on_hand + reorder_level (409 if exists).
Empty-state CTA guides creating records after adding variants (inventory is never auto-created).

### 9.5 Orders — `GET /admin/orders`, `GET|PATCH /admin/orders/{id}`
Table: order_number, customer (name/email), status, placed_at, total. Filters: status select, search (number/customer), date range `placed_from`/`placed_to` (validate from ≤ to), sort (incl. `customer_name`, `-total_amount`). Detail (admin projection): everything customer sees + customer summary card + shipment card (carrier, tracking_number, shipped_at, delivered_at).
**Status actions** encode the transition matrix — render only legal next steps:
pending→confirmed|cancelled · confirmed→processing|cancelled · processing→shipped|cancelled · shipped→delivered · delivered→returned · returned→refunded · cancelled/refunded terminal.
Shipping requires carrier (required input) + optional tracking; refund/return show confirm dialogs noting side effects (stock release/refund recorded server-side). 409 illegal/no-op transitions handled gracefully.

### 9.6 Review moderation — `GET|PATCH|DELETE /admin/reviews`
Queue table: product, rating, title/excerpt, customer, `is_approved` badge, deleted rows when `include_deleted`. Filters: search (product/title/comment/customer/email), rating, `is_approved=true|false|all`, sort. Actions: approve/unapprove toggle, edit content (rating/title/comment; images read-only here), delete (soft; confirm). Detail view includes images and customer_email.

### 9.7 Customers — `GET|PATCH /admin/users`, suspend/activate/role
Table: name, email, phone, status, email_verified, created_at; search, status filter (ACTIVE/SUSPENDED/DELETED), include_deleted, sort. Detail/edit: names/email/phone (409 duplicates, 422 validation). Actions:
- Suspend (revokes sessions server-side) / Activate with confirms; 400 already-in-state handled.
- **Role control visible only to SUPER_ADMIN** (`PATCH /admin/users/{id}/role` CUSTOMER↔ADMIN): promote/demote with confirmation; surface 400 self-change, 403 non-super-admin, 409 last-admin protection.

## 10. Endpoint Coverage Checklist (every implemented endpoint → UI)

**Auth:** POST /auth/register → Register · POST /auth/login → Login · GET /auth/session → Session provider · GET /auth/csrf-token → CSRF interceptor · GET /auth/sessions → Devices · DELETE /auth/session → Logout · DELETE /auth/sessions → Revoke others · DELETE /auth/sessions/{id} → Revoke row · POST /auth/email-verification/verify → /verify-email · POST /auth/email-verification/resend → Banner/landing CTA
**Users:** GET|PATCH|DELETE /users/me → Profile/delete · PATCH /users/me/password → Password · POST /users/me/email(+/verify) → Change email · POST /users/me/phone-number(+/verify) → Change phone
**Addresses:** GET|POST /users/me/addresses · GET|PATCH|DELETE /users/me/addresses/{id} → Address book + checkout
**Catalog public:** GET /products → Listing · GET /products/{id} → PDP · GET /categories · GET /categories/{id} · GET /categories/{id}/products → Nav/category pages
**Cart:** GET /cart · POST /cart/items · PATCH|DELETE /cart/items/{id} · DELETE /cart → Cart page + PDP add-to-cart
**Orders customer:** POST /orders → Checkout · GET /orders · GET /orders/{id} → History/detail
**Reviews public:** GET /products/{id}/reviews → PDP reviews · GET /reviews/{id} → deep link
**Reviews user:** POST /reviews · PATCH|DELETE /reviews/{id} · GET /users/me/reviews → PDP + My reviews
**Admin products:** GET /admin/products/uploads/imagekit-auth → Upload widget · GET|POST /admin/products · GET|PATCH|DELETE /admin/products/{id} → Products
**Variants/images:** GET|POST …/variants · GET|PATCH|DELETE …/variants/{id} · GET|POST …/images · GET|PATCH|DELETE …/images/{id} · variant-images ×5 → Editor tabs
**Categories admin:** ×7 → Categories screen
**Inventory admin:** GET|POST /admin/inventory · GET|PATCH /admin/inventory/{var} → Inventory screen
**Orders admin:** GET /admin/orders · GET|PATCH /admin/orders/{id} → Orders screens
**Reviews admin:** ×4 → Moderation queue
**Users admin:** GET /admin/users · GET|PATCH /admin/users/{id} · PATCH …/suspend · PATCH …/activate · PATCH …/role → Customers screen

## 11. Quality Bar

- Every list: loading skeleton, empty state, error state with retry, debounced search (300ms), preserved filters in URL query params.
- Every mutation: optimistic update where safe (cart qty, toggles) with rollback + toast on error; destructive actions require confirmation dialogs.
- Forms: Zod validation with inline field errors; server 422/409 messages mapped onto fields where identifiable.
- Accessibility: labeled inputs, keyboard-navigable dialogs/menus, focus management on route change, AA contrast, visible focus rings.
- Responsive: mobile-first storefront (bottom-safe CTAs, collapsible filters); admin usable ≥1024px.
- Performance: route-level code splitting (admin bundle separate), TanStack Query cache keyed by full query params, image lazy loading.
- Security: never log/store secrets; rely on HttpOnly cookies; sanitize rendered user content (reviews/comments) — render as text, never HTML.
- TypeScript strict end-to-end: hand-write API types from `docs/API_ENDPOINTS.md` payloads (discriminated unions for envelopes), no `any`.

## 12. Out of Scope (do NOT build)

- ~~Password-reset screens~~ — **implemented in T23** (`/forgot-password` wizard: email → 6-digit OTP → new password; the emailed link fallback targets the backend-served static page). See `tasks/T23-password-reset-otp.md`.
- Wishlist, loyalty points, recommendations — excluded from the backend by design. Platform-level analytics dashboards are now implemented (see `tasks/T25-analytics-section.md`, super-admin only).
- Real payment gateways — only the `mock` method exists; do not integrate Stripe/etc.
- Webhooks/streaming — none exist.
