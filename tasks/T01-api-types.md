# T01 — API Types

## Goal
Hand-written TypeScript types covering every endpoint surface in prompt §10,
transcribed from the backend docs — discriminated unions for envelopes, both pagination
shapes, enums as literal unions, money as decimal strings.

## Dependencies
T00.

## Reference (transcribe from these, do not invent fields)
- `D:\code\ecommerce\docs\API_ENDPOINTS.md` (all modules)
- Module details: `docs/api/authentication/*.md`, `docs/api/users/*.md`,
  `docs/api/products/*.md`, `docs/api/categories/categories.md`, `docs/api/cart/cart.md`,
  `docs/api/orders/orders.md`, `docs/api/reviews/reviews.md`,
  `docs/api/inventory/inventory.md`, `docs/api/admin/admin.md`

## Files under `src/types/`

### `envelopes.ts`
```ts
type Enveloped<T> = { success: true; data: T };            // addresses, products,
                                                            // categories, cart, orders,
                                                            // reviews, inventory, admin
// auth / users / sessions return bare objects, bare arrays, or 204 No Content
type ApiError = { status: number; code?: string; message: string };
```

### `pagination.ts`
```ts
type PaginationStandard = { page; limit; total; totalPages; hasNext; hasPrev };
type PaginationReviews  = { page; limit; total; has_more };
type Paginated<T> = Enveloped<T[]> & { pagination: PaginationStandard };
```

### `enums.ts` (prompt §3.7)
- `OrderStatus`: `pending | confirmed | processing | shipped | delivered | cancelled | returned | refunded` (lowercase)
- `VariantStatus`: `ACTIVE | DRAFT | INACTIVE | ARCHIVED` (uppercase)
- `StockStatus`: `IN_STOCK | LOW_STOCK | OUT_OF_STOCK`
- `UserRole`: `CUSTOMER | ADMIN | SUPER_ADMIN`; `UserStatus`: `ACTIVE | SUSPENDED | DELETED`
- `PaymentMethodV1`: `'mock'`

### Resource files (one per module)
`auth.ts` (RegisterResponse, SessionInfo `{authenticated,user?,session:{expiry}}`,
CsrfTokenResponse, UserSession row), `users.ts` (UserProfile, Address), `catalog.ts`
(Product + images[] w/ display_order/is_primary, Variant w/ price/cost/discount/final_price/
weight/dims/status, Category w/ product_count), `cart.ts` (Cart w/ items_count,
total_quantity, subtotal, lines), `orders.ts` (Order w/ order_number, placed_at, status,
totals breakdown incl discount_amount/shipping_fee/tax_amount/total_amount, items snapshot,
address snapshot, payment snapshot, shipment), `reviews.ts` (Review w/ rating/title/comment/
images/customer_name/is_approved), `inventory.ts` (record w/ on_hand/reserved/available/
reorder_level/stock_status/last_stock_update), `admin.ts` (admin projections, ImageKitAuth
`{token,expire,signature,publicKey,urlEndpoint}`, role/suspend payloads).

Conventions:
- IDs are branded string literals where cheap: `type PrdId = \`prd_\${string}\`` (or plain
  `string` aliases — pick one style and apply everywhere).
- `type Money = string` (decimal, 2dp) — display only; never float math.

## Acceptance criteria
- [ ] Every request/response body used by any task in this plan has a named type
- [ ] Both pagination shapes + envelope union represented; helper guards
      `isEnveloped(x)`, `isPaginated(x)`
- [ ] Compiles under strict; sample JSON fixtures from docs parse against types in a test
