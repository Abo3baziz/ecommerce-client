# T21 — Manual reserve quantity management

## Goal
Admins can manually hold units of a variant ("reserve") or release existing
reservations, with an optional reason. Until now `quantity_reserved` was
order-flow-only (`docs/api/inventory/inventory.md`: "never editable through
this API"); this task adds a dedicated, guarded admin surface for it.

## Dependencies
T16 (inventory dashboard), backend inventory module.
No dependency on T19/T20.

## Interview decisions (2026-08-22)
- **Signed delta only** (+N hold / −N release) — mirrors how the order flow
  mutates reservations; no absolute-set mode that could clobber concurrent
  order holds.
- **Cap at available**: reject changes that would push reserved > on-hand,
  same invariant as checkout's `reserveStock`. Release capped at current
  reserved (cannot release below 0).
- **Placement**: per-variant "Reserve" action in the product editor Variants
  tab rows AND the Inventory page rows (same shared dialog).
- **Audit**: optional reason text (≤255), logged with actor/variant/change via
  structured logger (no audit table exists; same treatment as adjust reason).

## Backend contract — `PATCH /api/v1/admin/inventory/{variant_public_id}/reserve`
Auth/session identical to other admin inventory routes.

Request:
```
{ "change": -3, "reason": "hold for damaged-unit inspection" }
```
- `change` integer ≠ 0 (signed delta; positive reserves, negative releases)
- `reason` optional ≤255 chars

Behavior:
- Single atomic UPDATE mirroring order-flow guards:
  - change > 0 → allowed only while
    `(quantity_on_hand - COALESCE(quantity_reserved,0)) >= change`
  - change < 0 → allowed only while `COALESCE(quantity_reserved,0) >= |change|`
- Sets `last_stock_update = now()`
- Logs `{ actorId, variant_public_id, change, reason }` on success

Response: updated inventory record (same shape as `GET /admin/inventory/{id}`).

Errors: 400 validation (zero/non-int change, long reason) · 404 unknown
variant or missing inventory record · 409 guard violation (would over-reserve
or over-release).

Docs: add endpoint to `docs/api/inventory/inventory.md`; reword the
"quantity_reserved is never editable" note to scope it to the generic adjust
endpoint (manual edits happen only through this dedicated route).

## Frontend
- Types: `ReserveInventoryInput { change: number; reason?: string }`.
- `features/admin/inventory-api.ts`: `reserveAdminInventory(variantPublicId, input)`.
- New shared `ReserveInventoryDialog` (in `inventory-components/`, next to
  `AdjustInventoryDialog`):
  - Shows current on-hand / reserved / available (fetches the inventory
    record; 404 → empty state guiding to create the record first).
  - Signed integer input, non-zero; live preview of resulting reserved and
    available values; submit disabled when preview violates caps
    (+max = available, −max = reserved).
  - Optional reason input; 409 mapped inline; success invalidates the
    inventory record + list queries (and product variants where visible).
- Entry points:
  - `/admin/products/[productId]` Variants tab rows — new "Reserve" action
    alongside edit/delete.
  - `/admin/inventory` rows — "Reserve" button next to "Adjust".

## Acceptance criteria
- [ ] Endpoint guards both directions atomically; concurrent-safe under the
      same conditions as reserveStock/releaseStock; documented in inventory.md
- [ ] Dialog blocks impossible inputs client-side and surfaces 409 server-side
- [ ] Reserved changes reflect immediately in Variants tab, Inventory page,
      and storefront availability (available = on-hand − reserved)
- [ ] Reason appears in backend logs with actor and variant ids
- [ ] Loading/error/empty states per the Definition of Done
- [ ] Typecheck, lint, vitest green (client); backend typecheck green

## Notes
- No DB migration needed — the column already exists and is nullable;
  `COALESCE(quantity_reserved, 0)` semantics preserved everywhere.
- Out of scope: scheduled/auto-release of manual holds, audit-log table.
