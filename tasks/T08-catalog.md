# T08 — Catalog: Home, Listing, Categories

## Goal
Public browsing surfaces: home page, product listing with URL-synced controls, category
navigation and detail pages.

## Dependencies
T02–T06.

## Reference
`docs/api/products/products.md`, `docs/api/categories/categories.md`.

## Endpoints
- `GET /products` — params `search`, `brand`, `sort` (`name|created_at|updated_at`,
  `-` desc prefix, default `-created_at`), `page`, `limit`
- `GET /categories` · `GET /categories/{id}` · `GET /categories/{id}/products`

## Routes

### `/` Home
Hero-lite + latest products (first page of `GET /products`) + categories strip linking
detail pages.

### `/products`
- **URL-synced state** (searchParams ↔ component): `search`, `brand`, `sort`, `page`,
  `limit=20`; back/forward and refresh preserve filters (prompt §11)
- Search input debounced 300ms; in-flight request cancelled via query key change
- Brand filter: text/select populated from loaded results + free-text fallback
- Sort control with direction toggle (default `-created_at`)
- Grid of cards: primary image (lazy), name, brand → links to PDP; skeleton grid while
  loading; empty ("no results") and error+retry states
- Note: API only returns products having ≥1 active variant — **no stock badges here**

### `/categories/[id]`
- Category header: name, description, `product_count` badge
- Embedded product grid reusing the listing components but querying
  `/categories/{id}/products` with identical controls; 404 → friendly "category not found"

### Category data reuse
Header dropdown + footer consume the same `['categories']` query (T06).

## Acceptance criteria
- [ ] All controls reflected in URL and restored on reload/share
- [ ] Debounced search fires once per pause; stale responses never overwrite newer ones
      (query key includes full params)
- [ ] Pagination wired through shared `<Pagination>` (standard shape)
