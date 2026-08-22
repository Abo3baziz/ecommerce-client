# T11 — Cart & Checkout

## Goal
Cart management and the checkout wizard ending in `POST /orders`.

## Dependencies
T09 (add-to-cart cache), T03 (session), T02–T06.

## Reference
`docs/api/cart/cart.md`, `docs/api/orders/orders.md`, `docs/api/users/addresses.md`.

## `/cart`
- `GET /cart` — **404 means "no cart yet" → render empty state, not an error**
- Lines: image, name, color/size/SKU, unit `final_price` (+discount note when applicable),
  quantity stepper, `line_total`, remove
- Quantity: absolute set via `PATCH /cart/items/{variant_public_id}` **debounced ~500ms**,
  optimistic update with rollback + toast on error; clamp 1–999 client-side
- Remove line: `DELETE /cart/items/{variant_public_id}`
- Header stats from cart object: `items_count`, `total_quantity`, subtotal (`<Money>`)
- Clear cart → `<ConfirmDialog>` → `DELETE /cart`; empty-cart CTA to catalog

## `/checkout` (guards)
`<AuthGate>` + verified email (else banner linking verify flow) + non-empty cart (else
empty state). Stepper UI with 4 steps:

1. **Address** — radio list from `GET /users/me/addresses` (default shipping preselected);
   inline collapsible create-address form (`POST /users/me/addresses`, Zod mirror §3.6);
   refetch list after create so server-side default auto-unsets are reflected
2. **Payment** — single option `mock`, explicitly labeled "(test provider)"
3. **Coupon** — optional `coupon_code` input; validated only at order time; 409 messages
   (invalid/expired/min-order) surfaced inline at submit
4. **Notes** textarea ≤1000 w/ counter

Summary panel: subtotal, discount_amount, shipping_fee, tax_amount, total_amount —
display-only `<Money>` values as returned by the API (shipping logic is server-side).

### Place order
- `POST /orders` (exact body per orders.md — address id, payment method, coupon, notes)
  → success screen with created order (`status: confirmed`) → auto-redirect
  `/orders/{orderId}?placed=1`
- Error mapping: 400 bad method/address format inline · 404 cart/address missing actionable
  message · 409 empty cart / unpurchasable line / insufficient stock (**link back to
  /cart**) / coupon issue — distinct guidance per case

## Acceptance criteria
- [ ] Optimistic qty update rolls back on rejection (e.g. oversell guard) with toast
- [ ] Checkout blocked states (unverified email, empty cart) each show their specific gate
- [ ] Happy path creates an order and lands on its detail page
- [ ] Each documented 409 branch renders its targeted message
