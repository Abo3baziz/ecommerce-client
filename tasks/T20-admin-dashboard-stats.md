# T20 — Admin dashboard: statistics & section control

## Goal
Replace the counts-only `/admin` page with a real operations dashboard: revenue
(gross & net), orders pipeline by status, top sellers, stock-health alerts,
customer/review signals, and a recent-orders feed — each block deep-linking into
its admin section ("smart cards"). Backed by a new aggregate stats endpoint in
the backend repo (`D:\code\ecommerce`) — analytics were previously excluded
there by design; this task adds a minimal, read-only reporting surface.

## Dependencies
T15–T17 (admin sections live), backend admin guard middleware.
No dependency on T19.

## Reference
`docs/api/admin/admin.md` (backend — gains a Statistics section),
existing list contracts for `/admin/orders`, `/admin/inventory`, `/admin/reviews`,
`/admin/users`. Backend module convention: `src/modules/<name>/{routes,controller,service,dto,repository}`.

## Interview decisions (2026-08-22)
- Source: **new backend endpoint** (true aggregates, no client-side pagination math).
- Shape: **one aggregate endpoint**; recent orders reuses `GET /admin/orders`.
- Revenue: show **gross AND net** side by side.
- Top products ranked by **units AND revenue** (same ranked list).
- Time control: **presets only** — Today / 7d / 30d (server computes bounds, UTC).
- Section control depth: **smart cards + links**, no inline mutations on the dashboard.
- Charts: **yes — recharts** via the shadcn `chart.tsx` wrapper.

## Backend contract — `GET /api/v1/admin/stats?period=today|7d|30d`
Auth: session + `ADMIN`/`SUPER_ADMIN` (same guard as other admin routes).
Response `{ success: true, data: … }`; money fields are decimal-as-string.

```
{
  period:    { preset: "7d", from: "...", to: "...", bucket: "day" | "hour" },
  revenue:   { gross_total, net_total, refunded_total,
               order_count, avg_order_value },
  series:    [ { bucket_start, gross, net } ],        // hourly for today, daily otherwise
  orders_by_status: { PENDING, CONFIRMED, PROCESSING, SHIPPED,
                      DELIVERED, CANCELLED, RETURNED, REFUNDED },  // in-period counts
  top_products: [ { product_public_id, name, slug, units, revenue } ], // limit 5
  stock_health:      { low_stock_count, out_of_stock_count },
  customers:         { total_active, new_in_period },
  reviews:           { pending_moderation_count }
}
```

Definitions (fixed here so FE/BE/tests agree):
- `gross_total` = Σ `orders.total_amount` where status NOT IN (`CANCELLED`);
  `refunded_total` = Σ where status = `REFUNDED`; `net_total` = gross − refunded;
  `avg_order_value` = gross ÷ `order_count` (0 when none).
- `series` buckets use `placed_at` (`date_trunc`), same inclusion rule as gross.
- `top_products`: from `order_items` joined to variants/products for non-cancelled
  in-period orders; `units` = Σ quantity, `revenue` = Σ total_amount.
- `stock_health` mirrors the inventory page's `LOW_STOCK` / `OUT_OF_STOCK`
  statuses (soft-deleted variants excluded).
- `customers.total_active` = role CUSTOMER, status ACTIVE, not deleted;
  `new_in_period` by `created_at`.
- `reviews.pending_moderation_count` = `is_approved=false`, `deleted_at IS NULL`.

Implementation notes: new `src/modules/stats/*`; repository runs the aggregates
in parallel (Prisma `groupBy`/`aggregate` or one raw SQL pass); existing indexes
on `orders(status)`, `orders(placed_at)`, `reviews(is_approved)` cover it.
Document under "Statistics" in backend `docs/api/admin/admin.md`; track in
backend `PROJECT_PROGRESS.md`.

## Frontend — `/admin` rebuild
- Deps: add `recharts`; add shadcn `components/ui/chart.tsx` (ChartContainer etc.).
- Types: `src/types/admin-stats.ts` (`AdminStatsV1`, period preset union).
- API: `src/features/admin/dashboard-api.ts` — `useAdminStats(preset)` keyed
  `[qk.admin.stats, preset]` (staleTime ~60s); **retire `useAdminQuickCounts`**
  (section counts now come free from the same payload).
- Page layout (period toggle persisted in URL `?period=`):
  1. Header + Today/7d/30d toggle.
  2. KPI row: Gross revenue · Net revenue (sub: refunded) · AOV · New customers.
  3. Revenue trend — area chart, gross & net lines over `series`.
  4. Orders by status — horizontal bar; bar/click → `/admin/orders?status=…&placed_from=…&placed_to=…`.
  5. Smart section cards (existing six): Inventory shows low/out alerts →
     pre-filtered inventory; Reviews shows pending count → queue; Orders shows
     in-period count; Customers shows new-in-period.
  6. Top products — ranked list w/ units + revenue columns → product editor links.
  7. Recent orders — mini-table (8 rows, `GET /admin/orders?page=1&limit=8&sort=-placed_at`)
     → detail pages; "View all" → orders list.
- Every block: skeleton while loading, error state w/ retry, empty state
  (fresh-store zeros render gracefully, charts hide when no data).

## Acceptance criteria
- [x] Backend endpoint returns contract payload; 401/403 for non-admins; invalid
      `period` → 400 via validation; documented in backend admin.md
- [x] Dashboard renders all blocks against dev data; presets change every
      time-sensitive number coherently
- [x] Status bars, stock alerts, cards, rows deep-link into pre-filtered lists
- [x] No regression: section pages untouched; old quick-counts hook replaced by
      stats payload (+ a two-query catalog count for Products/Categories cards)
- [x] Loading/error/empty states per block
- [x] Typecheck, lint, vitest green in client repo; backend typecheck green.
      NOTE: backend `npm test` intentionally NOT run — per tasks/T-032 the
      integration suite wipes this shared dev schema.

## Notes
- Amounts stay decimal-as-string end-to-end; format via `<Money>` on the client.
- No caching layer server-side (v2 concern); react-query staleness is enough.
