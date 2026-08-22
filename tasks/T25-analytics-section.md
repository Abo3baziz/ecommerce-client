# T25 — Analytics: super-admin business & financial insights

## Goal
A super-admin-only **Analytics** section monitoring platform financial health:
product revenue vs collected totals, COGS + operating expenses, gross/net
profit, trends over a custom date range, product/category/customer/sales-
quality insights, plus an expenses ledger the super admin maintains manually.

> Domain note: prompt boilerplate mentioned "restaurant owners/staff"; mapped
> onto this platform's roles (`CUSTOMER < ADMIN < SUPER_ADMIN`). Regular
> admins never see the section nor can they call its APIs (403).

## Interview decisions (2026-08-22)
- Name: **Analytics** (grows beyond finance later).
- Expenses: **COGS** derived from `order_items × variants.cost_price` **plus**
  a new manual `operating_expenses` ledger (rent/salaries/marketing/…) → true
  net profit.
- Revenue: show **both** product revenue and collected total side by side.
- Insight blocks: core P&L set + product/category performance + customer
  growth + sales-quality metrics (all v1).
- Date control: presets 7d/30d/90d **and** custom from/to (URL-persisted).

## Backend contract changes (`D:\code\ecommerce`)

### Schema — `operating_expenses` (new)
`public_id` · `description` VarChar(255) · `category` enum(`expense_category`:
RENT, SALARIES, MARKETING, UTILITIES, SHIPPING, SOFTWARE, OTHER) · `amount`
Decimal(12,2) ≥ 0.01 · `spent_at` Date · `created_by_users_id` → users ·
timestamps. Indexes: `spent_at`, `category`.

### Expense ledger API (SUPER_ADMIN only)
- `GET    /admin/analytics/expenses?category&date_from&date_to&page&limit`
- `POST   /admin/analytics/expenses` `{description, category, amount, spent_at}`
- `PATCH  /admin/analytics/expenses/{public_id}` (partial edit)
- `DELETE /admin/analytics/expenses/{public_id}` (hard delete)
Validation errors 400/422 · unknown id 404. Mutations are auto-audited by the
T22 middleware (`admin.analytics.create/update/delete`).

### Insights read API — `GET /admin/analytics/overview` (SUPER_ADMIN only)
Params: `date_from`, `date_to` (defaults last 30 days, UTC bounds).

```
range:        { from, to }
revenue:      { product_revenue, collected_total, shipping_collected,
                tax_collected, discounts_given, refunded_total }
costs:        { cogs, operating_expenses, total_costs }
profit:       { gross_profit, net_profit, net_margin_pct }
orders:       { count, avg_order_value }
series:       [ { bucket_start, product_revenue, collected_total, costs } ]
top_products: [ { product_public_id, name, units, revenue, cogs, gross_margin } ]  // max 8
category_share:[ { category_public_id, name, revenue, share_pct } ]
customers:    { total_active, new_in_range, repeat_purchase_pct }
sales_quality:{ discounted_orders_pct, coupons_redeemed }
```

Definitions (fixed):
- Basis: orders placed in range, status NOT IN (CANCELLED, REFUNDED);
  `refunded_total` reported separately (Σ total_amount of REFUNDED orders).
- `product_revenue` = Σ(subtotal − discount_amount); `collected_total` =
  Σ(total_amount); shipping/tax broken out (tax is not income).
- `cogs` = Σ(order_items.quantity × variant.cost_price at sale time is not
  snapshotted — current cost_price used; documented limitation).
- `gross_profit` = product_revenue − cogs; `net_profit` = product_revenue −
  cogs − operating_expenses; `net_margin_pct` = net ÷ product_revenue × 100.
- `repeat_purchase_pct` = customers with ≥2 qualifying orders ÷ customers
  with ≥1, in range.
- Money decimal-as-string throughout.

### Docs & specs
New `docs/api/admin/analytics.md`; FRONTEND_PROMPT §12 "analytics dashboards"
line scoped/amended; tasks/index registered.

## Frontend — `/admin/analytics/*`

### Access control
- New `SuperAdminGate` (wraps ForbiddenCard) driven by the existing
  `isSuperAdmin` probe; protects every analytics route against direct URL
  entry. Sidebar entries hidden unless probe passes. Backend enforces anyway.
- Sidebar gains an "Analytics" group (icon TrendingUp) with Overview +
  Expenses items, rendered only for super admins.

### `/admin/analytics` (overview)
- Range bar: 7d/30d/90d presets + custom from/to date inputs (?from=&to=).
- KPI cards: Product revenue · Collected total · Total costs (COGS + opex) ·
  Net profit w/ margin badge.
- Chart: revenue-vs-costs daily trend (recharts area/lines, CSS-var colors →
  automatic dark-mode support).
- Grid: expense breakdown by category (horizontal bars) · category sales
  share (donut) · customer growth stats · sales-quality card (discounted
  orders %, coupons redeemed, AOV).
- Table: top products with units/revenue/margin columns → editor links.
- Skeletons/error-retry/empty states per DoD; responsive grids (1→2→4 cols).

### `/admin/analytics/expenses` (ledger management)
- Filterable table (category select, date range), paginated.
- Create/edit dialog: description, category select, amount, spent_at date;
  Zod inline errors; delete behind ConfirmDialog.

## Acceptance criteria
- [ ] Regular ADMIN: no sidebar entry, direct URL shows forbidden card,
      all analytics APIs return 403 (server-side role check)
- [ ] Overview numbers reconcile against SQL spot-checks for a chosen range;
      both revenue bases + refund figure present
- [ ] Expenses CRUD works; created/deleted expenses immediately shift net
      profit and are audit-logged automatically
- [ ] Charts render in light AND dark mode; layout usable at mobile widths
- [ ] Typecheck/lint/vitest green (client); backend typecheck green; backend
      suite still NOT run against dev DB (T-032)

## Notes
- Architecture flexible for future blocks (restaurant/per-store comparison,
  subscriptions, AI insights): single overview endpoint + separate ledger
  service keeps concerns separable; new widgets = new payload sections.
- Out of scope: historical cost snapshots, refunds ledger, export/CSV,
  scheduled reports.
