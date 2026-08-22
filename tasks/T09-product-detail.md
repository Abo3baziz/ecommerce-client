# T09 — Product Detail (PDP)

## Goal
Product page: gallery, variant picker with live pricing, add-to-cart with merge semantics.

## Dependencies
T08 (routing/nav), T02–T06. Reviews section lands in T10 — reserve an `#reviews` anchor.

## Reference
`docs/api/products/products.md` (+ variant/image payload fields).

## Route
`/products/[productId]`

### Data & errors
- `GET /products/{product_public_id}` → envelope
- 404 → "This product isn't available" state; 400 invalid id → same friendly treatment

### Gallery
- Product images sorted by `display_order`; `is_primary` marked (default selection)
- Thumbnails + main image; when the selected **variant** has its own images, swap gallery
  to them (fallback to product gallery)

### Variant picker
- Group selectable options by `color` and `size` — either dimension may be absent; only
  render groups that exist; combinations not present are disabled
- Selection updates the price block: `price`, strikethrough original when
  `discount_percentage > 0` plus highlighted computed **`final_price`**, and weight
- Default-select first available variant for fewer clicks

### Add to cart
- Quantity stepper clamped 1–999
- Requires selected variant (else inline hint); requires auth → on 401 redirect
  `/login?from=<pdp>`
- `POST /cart/items { variant_public_id, quantity }` — **merge semantics**: adding an
  existing line increments it (server enforces; client caps input at 999)
- Response returns full cart → write into `['cart']` cache (`setQueryData`) + open
  mini-cart toast (Zustand UI store from T06): line summary, subtotal, "View cart" link
- Errors: 400 invalid variant, 409 stock/oversell guard → actionable message

## Acceptance criteria
- [ ] Switching variants swaps gallery + price/final_price/weight correctly
- [ ] Adding twice increments quantity rather than duplicating a line
- [ ] Anonymous add redirects to login and returns to PDP afterwards
