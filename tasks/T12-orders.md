# T12 — Orders (Customer)

## Goal
Order history and immutable order detail with status timeline.

## Dependencies
T11 (creates orders), T02–T06.

## Reference
`docs/api/orders/orders.md`.

## Endpoints
- `GET /orders` — params `status`, `sort` (`placed_at | order_number | total_amount`, `-`
  prefix), `page`, `limit`
- `GET /orders/{order_public_id}`

## `/orders`
- Status filter tabs: All + each `OrderStatus` literal (URL-synced)
- Sort select + direction; standard `<Pagination>`
- Rows: order_number, `<StatusBadge>`, placed_at date, total_amount, item thumbnails
  (first ~4 images + overflow count)

## `/orders/[orderId]`
404 → friendly "order not found" (ownership is deliberately hidden by the API).

Sections:
1. **Status timeline** — lifecycle steps in canonical order up to current status;
   cancelled/refunded render correctly as terminal branches; timestamps where provided
2. **Items snapshot** — name, sku, variant attrs, qty, unit price, line subtotal —
   rendered exactly as returned (immutable snapshot)
3. **Shipping address** card — snapshot fields
4. **Payment** card — provider (`mock`), status, reference, amount
5. **Totals** breakdown — subtotal, discount_amount, shipping_fee, tax_amount,
   total_amount
6. Notes block

Landing with `?placed=1` shows a success banner above detail (checkout redirect).

Admin reuses these display components for its superset view (T17) — extract them into
`src/features/orders/components/` now.

## Acceptance criteria
- [ ] Timeline correct across statuses incl. cancelled and refunded terminals
- [ ] Snapshots never recomputed client-side (no price math on strings)
- [ ] History filters/sort/pagination URL-synced
