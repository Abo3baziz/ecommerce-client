# T27 — Coupon analytics (inside Analytics)

## Goal
Coupon performance insights for the platform: coupon counts by derived
status, redemption totals and trends, discount spend, revenue attributable to
coupon orders, and a most-used ranking — rendered as a new page inside the
existing super-admin **Analytics** area.

## Dependencies
T25 (Analytics area: gate, layout, chart infra). Reads `coupons` /
`coupon_usages` tables directly — does **not** depend on T26's management
CRUD being built first.

## Grilling decisions (2026-08-23)
- **Access**: SUPER_ADMIN only — it lives inside `/admin/analytics/*`, which
  is uniformly super-admin-gated (loosening later is trivial).
- **Revenue impact** shows two honest figures side by side: **discounts
  given** through coupons AND **revenue from coupon orders** (+ share of
  orders using coupons). No counterfactual claims.
- **Trend**: one composed chart — daily redemption **count bars** + daily
  **discount amount line** over the selected range.
- Sidebar sub-item named **"Coupon insights"** (avoids clashing with T26's
  future top-level management item "Coupons").

## Backend contract — `GET /api/v1/admin/analytics/coupons`
SUPER_ADMIN only (`authorization(SUPER_ADMIN)`), same as other analytics
endpoints. Params: `date_from`, `date_to` (optional ISO; default last 30 days
UTC). Redemptions are filtered by `coupon_usages.redeemed_at` in range;
revenue attribution joins the order and excludes CANCELLED/REFUNDED.

```
{
  "success": true,
  "data": {
    "range": { "from": "...", "to": "..." },
    "totals": {
      "total_coupons": 0,          // not soft-deleted
      "active_coupons": 0,         // derived status ACTIVE at now
      "inactive_coupons": 0,       // is_active=false
      "expired_coupons": 0,        // past expires_at (and active flag true)
      "usage_limit_reached": 0,
      "lifetime_redemptions": 0,   // Σ coupons.usage_count
      "range_redemptions": 0,      // COUNT coupon_usages in range
      "discounts_given_in_range": "...",
      "coupon_orders_count": 0,    // distinct orders w/ coupon in range
      "coupon_orders_revenue": "...",  // Σ collected totals of those orders
      "coupon_orders_share_pct": "..."
    },
    "most_used": [ { "coupon_public_id", "code", "discount_type",
                     "discount_value", "is_active",
                     "lifetime_uses", "range_redemptions",
                     "discounts_given_in_range" } ],   // max 8 by lifetime
    "trend": [ { "date", "redemptions", "discount_amount" } ]  // zero-filled daily
  }
}
```

Status derivation reuses the T26 definition/order (inactive → expired →
limit-reached → active) so counts stay consistent once T26 ships.

Docs: add section to `docs/api/admin/analytics.md`.

## Frontend — `/admin/analytics/coupons` ("Coupon insights")
- Third item in the sidebar Analytics group (Ticket icon); protected by the
  same `SuperAdminGate` + backend 403s.
- Range bar mirroring the overview page: 7d/30d/90d presets + custom
  from/to, URL-persisted (?preset/?from/?to).
- Summary cards: Total coupons · Active · Inactive/Expired (split in
  sublabel) · Redemptions in range · Discounts given · Revenue via coupon
  orders (+ share %).
- Chart: ComposedChart — redemptions as bars, discount amount as line
  (recharts, CSS-var colors → automatic dark-mode support).
- Table: Most used coupons — code (mono), type/value badge, lifetime uses,
  in-range redemptions, discounts given; empty state when no data.
- DoD states throughout; responsive grid (cards 2→3 cols, table scrolls).

## Spec updates
FRONTEND_PROMPT route note extended: `/admin/analytics` covers overview,
expenses, and coupon insights (SUPER_ADMIN only).

## Acceptance criteria
- [ ] Endpoint returns all metric groups; numbers reconcile against SQL for a
      chosen range including boundary days
- [ ] Trend chart zero-fills days without redemptions
- [ ] Regular ADMIN: no nav entry, direct URL → forbidden card, API → 403
- [ ] Light/dark mode render correctly; mobile layout usable
- [ ] Typecheck/lint/vitest green (client); backend typecheck green; backend
      suite still NOT run against dev DB (T-032)

## Notes
- Independent of T26 build order, but ship after T26 if possible so the
  status-definition code path is shared rather than duplicated.
- Out of scope: per-customer coupon breakdowns, abandoned-cart coupon
  performance, export/CSV.
