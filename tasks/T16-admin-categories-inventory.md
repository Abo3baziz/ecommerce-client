# T16 — Admin: Categories & Inventory

## Goal
Category management incl. product assignment, and the inventory dashboard with adjust /
create-record flows.

## Dependencies
T02–T06, T15 (admin shell conventions, variant context).

## Reference
`docs/api/categories/categories.md` (admin section), `docs/api/inventory/inventory.md`.

## Endpoints
- `/admin/categories` ×7 incl. `PUT|DELETE /admin/categories/{cat}/products/{prd}`
- `GET|POST /admin/inventory`, `GET|PATCH /admin/inventory/{variant_public_id}`

## `/admin/categories`
- Table: name, slug, `is_active` switch (storefront visibility; optimistic toggle w/
  rollback), product_count, created_at
- Controls: search debounce, sort, include_deleted (dimmed rows), pagination
- Create/edit dialog: name*, slug optional + auto-generate hint, description nullable →
  409 `CATEGORY_SLUG_TAKEN` / `CATEGORY_NAME_TAKEN` mapped to fields
- Delete → confirm warning that **product links are removed**
- Detail drawer: assigned products list (`GET /admin/categories/{id}/products`) +
  searchable assign picker (search admin products) — assign `PUT …/products/{prd}`
  (idempotent), remove `DELETE …/products/{prd}`

## `/admin/inventory` — Stock dashboard
- Table: product_name, sku/barcode, on_hand, reserved, available, reorder_level,
  `<StatusBadge>` stock_status (`LOW_STOCK` amber, `OUT_OF_STOCK` red), last_stock_update
- Filters: search (sku/barcode/product name), stock_status select, include_deleted,
  sort incl. `-last_stock_update`; pagination
- **Row action: Adjust modal** (`PATCH /admin/inventory/{variant_public_id}`)
  - Mode radio: **Set absolute quantity XOR Signed delta** — mutually exclusive, enforce in
    UI (choosing one disables the other input)
  - reorder_level nullable number · optional reason ≤255 (audit-only text)
  - Live computed preview "current → result"; block negative outcomes client-side before
    submit too; server 409 "would drive stock below zero" → toast + refetch
- **Create record** (`POST /admin/inventory`): variant picker (searchable; variants without
  existing records), initial quantity_on_hand ≥0, reorder_level; 409 if record exists
- Empty state CTA copy: guide creating records after adding variants (**inventory is never
  auto-created server-side**)

## Acceptance criteria
- [ ] Set vs delta previews compute correctly; negative submissions blocked client-side
      AND handled on 409
- [ ] Category assignment picker assigns/removes with idempotent PUT behavior visible
- [ ] is_active toggle immediately affects storefront visibility (manual cross-check)
