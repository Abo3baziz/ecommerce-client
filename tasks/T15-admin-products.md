# T15 — Admin: Dashboard & Products

## Goal
Admin landing cards plus the full product manager: list, and tabbed editor
(details / variants + variant images / product images). Requires `<AdminGate>`.

## Dependencies
T02–T06, **T05** (ImageKit widget), T12 (reusable display components where handy).

## Reference
`docs/api/admin/admin.md`, `docs/api/products/{products,product-variants,product-images,
product-variant-images}.md`, ADR 0001.

## Endpoints (all under `/admin/products…`)
List/create/get/patch/delete products · variants ×5 · images ×5 · variant images ×5 ·
`GET /admin/products/uploads/imagekit-auth`.

## `/admin` Dashboard
Cards per section (Products, Categories, Inventory, Orders, Reviews, Customers) with quick
counts taken from list endpoints' `pagination.total` + section links.

## `/admin/products` — List
- Table: thumbnail, name, slug, brand, updated_at; deleted rows visible only with
  `include_deleted` toggle, rendered dimmed
- Controls: search debounce 300ms, brand filter, sort select, include_deleted switch,
  standard pagination
- Create dialog: name* (≤255), slug optional w/ "auto-generate" hint button (slugify),
  description ≤10000, brand ≤255 → `POST`; 409 `PRODUCT_SLUG_TAKEN` mapped to slug field

## `/admin/products/[productId]` — Editor tabs

### Tab: Details
- Form PATCH name/slug/description/brand — empty string maps to null to clear
  description/brand (per docs semantics)
- Danger zone: soft-delete product with warning that **variants are soft-deleted too**

### Tab: Variants
- Table: sku, barcode, color, size, price, discount%, status badge; filters:
  include_deleted, status select (`ACTIVE|DRAFT|INACTIVE|ARCHIVED`), sort; pagination
- Drawer form (create/edit): sku* ≤80 unique · barcode · color · size · price*
  (decimal ≥0, ≤10 int + 2 frac digits) · cost_price · discount_percentage 0–100 ·
  weight/l/w/h > 0 · status select (default ACTIVE; nullable clears)
- 409 `VARIANT_SKU_TAKEN` → sku field error; delete soft w/ confirm
- **Nested per-variant Images manager**: ordered by display_order; add via URL paste or
  T05 widget (alt_text, display_order default = next); reorder by editing display_order;
  hard delete w/ confirm; 409 `DISPLAY_ORDER_CONFLICT` → toast + refetch

### Tab: Images (product gallery)
- Grid ordered by display_order, primary marked ★
- Add dialog: T05 upload widget (primary path) or URL paste + alt_text + display_order +
  is_primary checkbox
- Set primary action demotes the old primary automatically (reflect via refetch);
  **clearing primary is disabled when it's the only image** (prevents documented 400)
- Hard delete w/ confirm noting primary auto-promotes next image

## Acceptance criteria
- [ ] Full CRUD cycles pass for products, variants, both image types against dev backend
- [ ] Slug/SKU/display-order conflicts surface inline/toast per spec
- [ ] include_deleted toggles show dimmed rows everywhere applicable
