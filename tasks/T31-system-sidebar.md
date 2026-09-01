# T31 — System sidebar (SUPER_ADMIN “System” section, 9 items)

## Goal

Add **System** as a SUPER_ADMIN-only sidebar group (matching Analytics/Reports/Governance patterns in `src/components/layout/admin-sidebar.tsx:60`) with 9 navigation items, respecting spacing/typography/active states/responsive drawer, and guard routes.

## Dependencies

T-100 (backend section keys). No hard block; sidebar can land before APIs.

## Facts — verified 2026-09-01

- Sidebar `src/components/layout/admin-sidebar.tsx:34` — `NavItem {href,label,icon,exact}`, 5 groups (`NAV_ITEMS`, `ANALYTICS_NAV_ITEMS`, `REPORTS_NAV_ITEMS`, `ADMIN_MGMT_NAV_ITEMS`, `SUPER_ADMIN_NAV_ITEMS`), gated by `isSuperAdmin` from `src/features/auth/session-context.tsx:77` (`GET /admin/audit` probe). Active via `useIsActive():50` (`exact ? pathname===href : startsWith`). Layout `src/app/admin/layout.tsx:9` `w-60 md:block` + `AdminMobileNav` `Drawer`. DoD `tasks/index.md:85`.

## Decisions

- Icons (lucide, no duplicates): General `Settings`, Commerce `ShoppingBag`, Payments `CreditCard`, Shipping `Truck`, Email `Mail`, Customers `UsersRound`, Security `Shield`, Admin & Permissions `ShieldCheck`, Financial `Wallet`.
- Labels must match §1 list verbatim (General Settings, Commerce Settings, … Financial Settings) for spec traceability.
- Group heading `System` `label-caps px-3 pb-1` + `mt-3 border-t pt-2` identical to Analytics/Reports.
- Routes `/admin/settings/<slug>` (general, commerce, payments, shipping, email, customers, security, admins, financial) — kebab, plural where spec plural.

## Implementation

### Frontend (`D:\code\client for ecommerce`)

1. `src/components/layout/admin-sidebar.tsx` — add `SYSTEM_SETTINGS_NAV_ITEMS: ReadonlyArray<NavItem>` (9 entries, `exact:true` only for `/admin/settings` if hub exists; otherwise none exact). Import 9 icons, render inside `isSuperAdmin ? <>` block as new `<div className="mt-3 border-t pt-2"><p className="label-caps px-3 pb-1">System</p>{renderLinks(SYSTEM_SETTINGS_NAV_ITEMS)}</div>` between Reports and Admin management.

### Backend

None.

## Acceptance criteria

- [ ] SUPER_ADMIN sees System group with 9 items; ADMIN does not see group nor any item.
- [ ] Active state `bg-primary text-primary-foreground` on current item, `aria-current="page"`.
- [ ] Mobile drawer shows same 9 items, closes on navigate.
- [ ] Spacing/typography/border identical to Analytics group.
- [ ] Direct navigation to `/admin/settings/*` as ADMIN shows `ForbiddenCard` (page-level gate).
- [ ] Lint/typecheck green.

## Notes

- Do not rely only on hiding links — page-level `ForbiddenCard` + backend 403 remain source of truth per §1/§11.
