# T26 — Coupon management section (+ audit integration)

## Goal
A "Coupons" admin section to manage discount coupons end-to-end: list,
create, edit, activate/deactivate, soft-delete, search/filter, and inspect
per-coupon redemption history — **with full audit-trail integration** so every
coupon mutation and redemption is traceable. Requires a brand-new backend
`coupons` admin module — today coupon validation only happens inline during
order placement (`orders.service.ts`, generic 409 "Coupon is invalid or not
applicable").

## Dependencies
None new; schema already fully supports the feature (`coupons`,
`coupon_usages`, `deleted_at`, all limit/date fields). Audit integration
builds on the T22 logging architecture (`recordAuditEvent`, `audit_logs`).

## Grilling decisions (2026-08-23)
- **Full-stack** build in both repos as one task.
- **Access**: `ADMIN` + `SUPER_ADMIN`; standalone flat sidebar item
  "Coupons" (Ticket icon) outside the Analytics group.
- **Delete**: soft delete via `deleted_at` + `include_deleted` toggle
  (matches products/categories).
- **Code immutability**: `code` becomes locked once `usage_count > 0`;
  every other field stays editable.
- **Status**: server-computed derived field on each row — checked in order:
  `!is_active` → `INACTIVE`; past `expires_at` → `EXPIRED`;
  `usage_count >= usage_limit` → `USAGE_LIMIT_REACHED`; else `ACTIVE`
  (a future `starts_at` still shows ACTIVE only from its start date;
  before that it reads INACTIVE).
- **Usage history**: drawer opened from a row action, not a separate route.
- **Audit integration** (amended 2026-08-23, see section below): coupon
  mutations and redemptions write **transactional** audit rows — the action
  rolls back if its audit record fails.

## Backend contract — `/api/v1/admin/coupons`

Auth: session + `ADMIN`/`SUPER_ADMIN`. Envelope per repo convention;
list responses carry standard pagination.

| Endpoint | Purpose |
| --- | --- |
| `GET /admin/coupons` | List: `page`, `limit`, `search` (code, case-insensitive), `status` filter (`active\|inactive\|expired\|usage_limit_reached` — server maps to WHERE clauses incl. time comparisons), `include_deleted`, `sort` (`code`,`discount_value`,`usage_count`,`starts_at`,`expires_at`,`created_at`; `-` desc) |
| `POST /admin/coupons` | Create → `409 COUPON_CODE_TAKEN` on duplicate code (case-insensitive) |
| `GET /admin/coupons/{public_id}` | Detail |
| `PATCH /admin/coupons/{public_id}` | Update; `409` if changing `code` while `usage_count > 0` |
| `DELETE /admin/coupons/{public_id}` | Soft delete (`deleted_at = now`) |
| `GET /admin/coupons/{public_id}/usages` | Redemption history page |

Create/update body:
```
code            string 3–50, uppercased, unique      (immutable once used)
discount_type   FIXED_AMOUNT | PERCENTAGE
discount_value  decimal > 0                        (% capped at 100)
minimum_order_amount   decimal ≥ 0, optional
maximum_discount_amount decimal > 0, optional       (percentage only; null ignored for fixed)
usage_limit     int ≥ 1, optional (null = unlimited)
usage_limit_per_user int ≥ 1, optional
starts_at       datetime, optional
expires_at      datetime, optional                 (> starts_at when both set)
is_active       boolean, default true
```

Derived `status` returned on every row alongside raw fields.

Usage history entry: `{ public_id, order_public_id, order_number, customer_name,
customer_email, redeemed_at }` (join through `coupon_usages` → `orders` →
`users`).

Error mapping follows the existing style: `400` validation, `409`
duplicates/locked-code edits, `404` unknown/deleted id.

Docs: new `docs/api/admin/coupons.md`.

## Audit integration (amended 2026-08-23)

### Schema — `audit_logs` gains two nullable columns (db push)
- `previous_values Json?` — full pre-image of the mutated row
- `changes Json?` — per-field diff: `{ field: { from, to } }`

Additive; other modules unaffected. Existing rows keep null.

### Policy — transactional for coupons
Coupon create/update/delete and redemption/release write their audit row
**inside the same DB transaction** as the action (`recordAuditEventInTx`
variant alongside T22's fire-and-forget helper). A failed audit insert rolls
back the business action — satisfying "no coupon action without an audit
record". The generic `/admin/*` capture middleware **skips** the coupons
prefix to avoid duplicate rows (add `"coupons"` to a skip-list in
`auditLog.ts`, documented in `docs/api/admin/audit.md`).

### Event catalog

| Action | Trigger | Actor | Payload |
| --- | --- | --- | --- |
| `admin.coupons.create` | POST success | admin | request_body = created coupon |
| `admin.coupons.update` | PATCH with field changes beyond `is_active` only-toggle | admin | `changes` per-field `{from,to}` + `previous_values` pre-image |
| `admin.coupons.status_change` | PATCH where ONLY `is_active` changed | admin | `changes: { is_active: { from, to } }` |
| `admin.coupons.delete` | DELETE success | admin | `previous_values` = row before soft delete |
| `coupon.redeemed` | checkout consumes coupon (`incrementCouponUsage` + `createCouponUsage` succeed) | customer placing order | body `{ code, order_public_id, customer_public_id, discount_amount }`, entity = coupon |
| `coupon.released` | cancel/refund path calls `restoreCouponUsage` | admin triggering transition | same shape as redeemed |

All events carry timestamp/ip/user-agent via the shared writer. Update diffs
cover exactly the requirement examples: discount value, usage limit,
expiration date, status.

### Code touchpoints
- `modules/coupons/service/*`: load pre-image before update/delete; write the
  matching event inside the service transaction.
- `modules/orders/service/orders.service.ts`: emit `coupon.redeemed` right
  after `createCouponUsage` inside the placement transaction.
- `modules/orders/service/admin.service.ts`: emit `coupon.released` beside
  `restoreCouponUsage`.
- New shared helper `recordAuditEventInTx(tx, input)` in the audit module
  (same shape as `recordAuditEvent`, bound to a transaction client).

## Backend contract — usage history endpoint
Unchanged from below; audit rows are separate infrastructure.

## Frontend — `/admin/coupons`

- Types: `AdminCoupon`, `AdminCouponListParams`, `CouponUsageEntry`,
  create/update inputs; status union as above.
- `qk.admin.coupons(params)` / `qk.admin.couponUsages(id)`;
  `features/admin/coupons-api.ts`.
- Sidebar: flat "Coupons" item (Ticket icon) after Inventory, gated by
  `AdminGate` like other sections (visible to all admins).
- List page: debounced search input, status select, include-deleted switch,
  sortable columns, pagination; rows dimmed when deleted; status badge with
  per-status colors added to shared `BADGE_STYLES`.
- Row actions: Edit · Activate/Deactivate (inline switch or menu) · View
  usage (drawer) · Delete (ConfirmDialog).
- Form dialog: code input (auto-uppercase, disabled-with-hint when locked),
  type select toggling the maximum-discount field visibility, numeric fields,
  date pickers for start/expiry (client cross-field check), active switch;
  Zod inline errors + server 409 mapping (`COUPON_CODE_TAKEN`,
  locked-code message).
- Usage drawer: paginated redemption table (order number link, customer,
  date).

## Spec updates
FRONTEND_PROMPT route table gains `/admin/coupons`; tasks/index registered.

## Acceptance criteria
- [ ] Full CRUD + activate/deactivate works against dev backend; duplicate
      code → 409 surfaced inline; editing code of a used coupon blocked
- [ ] Status derivation matches definition incl. boundary dates
- [ ] Soft-deleted coupons hidden by default, recoverable via toggle, and no
      longer redeemable at checkout
- [ ] Usage drawer lists real redemptions (verify after a test checkout)
- [ ] **Audit**: exactly one row per coupon mutation — create/update carry
      per-field `changes` + `previous_values`; status-only toggles emit
      `status_change`; deletes snapshot the pre-image; middleware does NOT
      double-log coupons (skip-list verified)
- [ ] **Audit**: checkout with coupon writes `coupon.redeemed` (code, order,
      customer, discount); cancel/refund writes `coupon.released`; a forced
      audit failure rolls back the coupon action (transactional proof)
- [ ] Regular ADMIN can manage; CUSTOMER role gets 403 from APIs
- [ ] DoD states (skeletons, empty, error-retry, URL-persisted filters)
- [ ] Typecheck/lint/vitest green (client); backend typecheck green; backend
      suite still NOT run against dev DB (T-032)

## Notes
- Scalability: keep the module self-contained (`modules/coupons`) so future
  promotion features (stacking rules, customer segments, auto-apply) extend
  it without touching orders logic.
- Transactional auditing is scoped to coupons only; the global middleware
  remains fire-and-forget per T22. Rolling the stricter guarantee out to all
  modules is a documented future enhancement.
- Out of scope: bulk import/export, scheduled auto-activation cron, per-user
  assignment UI (field exists but managed only via API).
