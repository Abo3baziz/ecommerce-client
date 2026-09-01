# T40 — System: Admin & Permissions + Financial (combined)

## Goal

SUPER_ADMIN management of admins/roles/permissions and financial revenue/P&L/expenses/coupons config §9+§10 — two pages sharing `admin_permissions` + `financial` sections, reusing existing Admin Management `src/app/admin/admins/page.tsx`.

## Dependencies

T31, T32, backend T-104.

## Facts

- Backend `admin_permissions` enriches `src/modules/admins`, `financial` covers `default_currency`, `tax_config`, `payment_fee`, `refund_accounting`, `coupon_cost_attribution`, `default_reporting_period`, `fiscal_year_start`, `report_preferences`, `expense_categories`.

## Decisions

- Admin & Permissions page: reuse `src/app/admin/admins/page.tsx` table + detail drawer, add columns last_login/active_sessions, actions invite/enable/disable/force reset/require 2FA/revoke sessions (reuses `src/features/admin/admins-api.ts` extended). Permissions matrix `Table` with `Checkbox` per permission/role, read-only for now.
- Financial page: Cards — Currency & Tax, Fees & Refunds, Coupon Attribution, Reporting (period/fiscal year), Expense categories (tag Input add/remove). Money `string`, percent `0-100`.
- Respect `UserRole.ADMIN` vs `SUPER_ADMIN` per `src/generated/prisma/enums.ts`.

## Implementation

1. Routes `src/app/admin/settings/admins/page.tsx` and `src/app/admin/settings/financial/page.tsx` — gates.
2. `src/features/admin/settings-components/admin-permissions-form.tsx` — matrix Table + invite Dialog (email + role) + ConfirmDialog for enable/disable/revoke.
3. `src/features/admin/settings-components/financial-form.tsx` — selects for currency/reporting/fiscal year, money inputs, expense categories `Input` tags with `X` remove.
4. Wire audit: both sections produce `admin.settings.*_update` diffs.

## Acceptance criteria

- [ ] Admin table shows last_login/active_sessions, invite → audit, revoke → session gone.
- [ ] Financial saves persist, reload reflects, expense categories allow custom beyond `expense_category` enum.
- [ ] Permissions matrix read-only but reflects DB `admin_permissions` JSON.
- [ ] SUPER_ADMIN only; ADMIN ForbiddenCard for both.
- [ ] All pages have loading Skeleton, ErrorState retry, success toast, dirty guard.

## Notes

- Split into two PRs if size exceeds 11 files — T40a (admins) + T40b (financial) but single index row keeps traceability.
