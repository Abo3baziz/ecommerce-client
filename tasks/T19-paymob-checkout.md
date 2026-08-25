# T19 — Paymob checkout flow

> **Status: WON'T DO (2026-08-25)** — Paymob integration dropped by product
> decision; checkout keeps the `mock` provider only. Backend counterparts
> T-081…T-087 marked `wontfix` in the backend repo.

## Goal
Add the Paymob payment option to checkout, drive customers through Unified
Checkout (redirect), and handle the return + pending-payment states on the
frontend. Backend contract changes land in backend repo T-081…T-087 — this
task is the storefront/admin surface for them.

## Dependencies
T11 (checkout wizard), T03 (session), T12 (order detail/pending states),
backend T-084 (async checkout), T-085 (webhook), T-086 (inquiry endpoint).

## Reference
Backend `docs/api/orders/orders.md` (updated by T-084/T-086),
`docs/api/payments/paymob-webhook.md` (T-085), Paymob skill
`references/code-frontend.md` (Unified Checkout redirect).

## Checkout payment step (`/checkout`)
- Payment radio list gains a second option alongside `mock`:
  - **"Card / Mobile Wallet (Pay via Paymob)"** — `payment_method: "paymob"`;
    hint that the customer is redirected to Paymob's secure checkout page.
- Keep `mock` visible and labeled "(test provider)" exactly as today
  (used in dev; backend keeps it available when Paymob is unconfigured).

## Place order (paymob branch)
- `POST /orders` with `payment_method: "paymob"` returns
  `{ …order, checkout: { redirect_url } }` (backend T-084):
  - On success: **do not** show the current success card; instead
    `window.location.href = redirect_url` (Unified Checkout).
  - On `503` ("Payment provider not configured"): inline error, allow retry,
    no cart/order side effects visible to user.
  - On `502` (intention failed after order creation): surface provider
    unavailable message + guidance that no charge was made; cart is already
    consumed — offer a "View order" link to the pending→cancelled order.
- Error mapping for `409`/`404` branches unchanged from T11.

## `/checkout/result` (new, return-from-Paymob landing)
- Route `GET /checkout/result?order=<order_public_id>`; `AuthGate`.
- On mount: poll `GET /orders/{order_public_id}/payment-status` (backend
  T-086) every ~3s (max ~2 min):
  - `confirmed` → success card (reuse `PlacedSuccessCard` styling) + redirect
    to `/orders/{id}?placed=1`
  - `cancelled` + payment failed → "Payment was not completed" card with
    "Return to cart / Try again" (cart is empty; CTA to catalog)
  - still `pending` → spinner + "Confirming your payment…"
- Never trust redirect query params for success state — only polled API state.

## Order status surface
- Order detail + history (T12 components): `pending` status renders with
  "Awaiting payment" badge treatment; payment card shows
  `provider: Paymob` + pending state; `cancelled` with failed payment renders
  the existing cancelled flow.
- `/orders/{id}?placed=1` from a paymob order: if still pending, offer a
  "Continue payment" link back to `/checkout/result?order=…` (inquiry will
  resolve or the order expires per backend TTL).

## Admin orders
- Pending rows: subtle "Awaiting payment" hint in the status cell
  (backend returns `pending` already; no new fields needed).
- Refund action (backend T-087): on `409` (gateway refused), toast the
  provider message; payment card remains "paid" — no local-only marking.

## Types
- `PaymentMethodV1` → union `"mock" | "paymob"` (check `src/types/enums.ts`).
- `Order`/`OrderPayment` types: add `provider?: string` if/when exposed by
  backend payloads; parse defensively (optional fields).

## Acceptance criteria
- [ ] Selecting Paymob + placing order redirects to Unified Checkout URL
- [ ] `/checkout/result` polls payment-status and resolves to confirmed /
      cancelled UI (never trusts redirect params)
- [ ] `pending` order states render correctly across order pages
- [ ] 502/503 errors from backend surface with actionable copy
- [ ] Admin refund refusal (409) shows provider error without marking refunded
- [ ] Typecheck, lint, vitest green

## Notes
- Live sandbox round-trip (test card) requires the merchant's Paymob test
  keys — coordinate with backend T-081 onboarding checklist.
