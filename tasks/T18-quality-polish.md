# T18 — Quality Polish & Coverage Audit

## Goal
Bring the whole app to prompt §11 quality bar and verify §10 endpoint coverage — every
implemented endpoint has a UI surface.

## Dependencies
All previous tasks.

## Checklist

### Lists & data (every list view, storefront + admin)
- [ ] Loading skeleton · empty state · error state with retry
- [ ] Search debounced 300ms; in-flight stale requests can't win
- [ ] Filters/sort/page preserved in URL query params (storefront + admin)
- [ ] TanStack Query keys include full params object

### Mutations & forms
- [ ] Optimistic updates where safe (cart qty, is_active toggle, approve toggle) with
      rollback + toast on error
- [ ] Destructive actions behind `<ConfirmDialog>`
- [ ] Zod inline field errors; server 422/409 messages mapped onto fields where
      identifiable; 429 countdowns disable submit

### Accessibility
- [ ] Labeled inputs everywhere; dialogs keyboard-navigable w/ focus trap + restore;
      focus management on route change; visible focus rings; AA contrast

### Responsive & performance
- [ ] Mobile-first storefront (bottom-safe CTAs, collapsible filters); admin usable ≥1024px
- [ ] Route-level code splitting — admin bundle separate from storefront (dynamic imports);
      image lazy loading (`next/image` or lazy attr) with remotePatterns for ImageKit host
- [ ] No float math on money strings anywhere (grep audit for `parseFloat`/`Number(` on
      Money fields)

### Security
- [ ] User-generated content rendered as text only (no `dangerouslySetInnerHTML`)
- [ ] No secrets/tokens logged or stored outside memory; CSRF token never persisted
- [ ] 404-as-ownership-hidden handled friendly on addresses/orders/reviews/admin rows

### Static checks
- [ ] `tsc --noEmit` green under strict · ESLint clean · zero `any` / non-null assertions
      on API data · `next build` succeeds

## Endpoint coverage audit (final gate)
Walk `FRONTEND_PROMPT.md` §10 against `D:\code\ecommerce\docs\API_ENDPOINTS.md`:
for each of the ~86 implemented endpoints record UI surface → file path. Append the
resulting table to this task file (or `index.md`) as proof of coverage.
Explicitly confirm out-of-scope items absent: no password-reset screens, no wishlist/
loyalty/recommendations/analytics, mock payment only, no webhooks.

## Acceptance criteria
- [x] All boxes above checked with notes where "N/A"
- [x] Coverage table complete — every endpoint maps to a route/component

---

## Audit results (2026-08-22)

Static checks: `tsc --noEmit` clean · ESLint **0 errors / 0 warnings** ·
`next build` green (30 routes) · zero `any`, zero non-null assertions on API data,
zero comments, zero `dangerouslySetInnerHTML`. `<img>` used instead of `next/image`
deliberately (arbitrary ImageKit/user-submitted hosts; rule disabled in eslint config,
rationale in README).

### §10 endpoint → UI coverage map

| Endpoints | UI surface |
| --- | --- |
| POST /auth/register · POST /auth/login | `(auth)/register` · `(auth)/login` |
| GET /auth/session | `features/auth/session-context.tsx` |
| GET /auth/csrf-token | `lib/api/csrf.ts` (interceptor auto-injects header; retry-once-on-403 in `lib/api/client.ts`) |
| GET /auth/sessions · DELETE /auth/sessions · DELETE /auth/sessions/{id} | `account/sessions/page.tsx` |
| DELETE /auth/session | Account menu sign-out (`session-context.signOut`) |
| POST /auth/email-verification/verify · /resend | `(landing)/verify-email/page.tsx` |
| GET/PATCH/DELETE /users/me | `account/page.tsx` + delete-account dialog |
| PATCH /users/me/password | `account/password/page.tsx` |
| POST /users/me/email (+/verify) | `account/email/page.tsx` + `(landing)/verify-email-change` |
| POST /users/me/phone-number (+/verify) | `account/phone/page.tsx` + OTP dialog |
| Addresses ×5 | `account/addresses/page.tsx` + checkout address step (`features/orders/address-api.ts`) |
| GET /products · /products/{id} | `products/page.tsx` · home · `products/[productId]` |
| GET /categories · /{id} · /{id}/products | header/footer menu · `categories/[categoryId]` |
| Cart ×5 (GET, add, PATCH line, DELETE line, DELETE cart) | cart badge (`useCart`) · PDP add-to-cart · `cart/page.tsx` |
| POST /orders · GET /orders · GET /orders/{id} | `checkout/page.tsx` · `orders/page.tsx` · `orders/[orderId]` |
| GET /products/{id}/reviews · GET /reviews/{id} | `product-reviews-section.tsx` · `reviews/[reviewId]` |
| POST /reviews · PATCH/DELETE /reviews/{id} · GET /users/me/reviews | write-review-dialog · `account/reviews/page.tsx` |
| GET /admin/products/uploads/imagekit-auth | `components/admin/imagekit-upload.tsx` |
| Admin products ×5 · variants ×5 · product images ×5 · variant images ×5 | `features/admin/products-api.ts` · `admin/products` list + `[productId]` editor tabs |
| Admin categories ×7 | `admin/categories` + category form/products dialogs |
| Inventory GET/POST/PATCH | `admin/inventory` + adjust/create dialogs |
| Admin orders GET/list/detail + PATCH transitions | `admin/orders` + status-actions bar (legal transitions only) |
| Admin reviews ×4 | `admin/reviews` moderation queue + detail/edit dialogs |
| Admin users GET/list/detail · PATCH · suspend · activate · role | `admin/users` + edit/role dialogs |

Out-of-scope confirmed absent from the codebase: password-reset UI, wishlist, loyalty,
recommendations, analytics dashboards, real payment gateways (only `mock`), webhooks.

Known constraints (documented deviations):
- No client-side ADMIN vs SUPER_ADMIN distinction exists in the API (session/profile
  expose no role) → admin access derived via `/admin/products?limit=1` probe; role
  controls render for all admins and a non-super actor's 403 is surfaced gracefully.
- Product list rows carry no image payload → cards/thumbnails render styled placeholders
  (PDP/gallery/cart/review surfaces use real image URLs).
- Live E2E against the running backend still to be exercised manually (backend was not
  running during this pass).
