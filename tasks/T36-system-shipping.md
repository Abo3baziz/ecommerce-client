# T36 — System: Shipping Settings page

## Goal

SUPER_ADMIN shipping configuration §5 — methods, zones, rates, free-shipping rules, delivery estimates, provider config.

## Dependencies

T31, T32, backend T-102.

## Facts

- Financial constants `FLAT_SHIPPING_FEE`, `FREE_SHIPPING_THRESHOLD` in `src/shared/constants` become `shipping` section DB.

## Decisions

- Cards: Methods (toggles), Zones (Json array editor: country/region/postcode inputs with add/remove), Rates (zone+weight+price table), Free-shipping rules, Delivery estimates (min/max days), Default method Select, Provider config masked.

## Implementation

1. `src/app/admin/settings/shipping/page.tsx` — gate.
2. `src/features/admin/settings-components/shipping-form.tsx` — manage `zones`/`rates` arrays with `useFieldArray` or local state, Zod array validation, `Switch` per method, money Inputs for rates.
3. Add/remove rows with `Button variant=outline`, delete behind `ConfirmDialog` if rate in use.

## Acceptance criteria

- [ ] Zones/rates CRUD persists, validates, audits per-field diff.
- [ ] Default method Select lists enabled methods only.
- [ ] SUPER_ADMIN only; ADMIN ForbiddenCard.

## Notes

- Rely on backend `rates` moneyField validation; frontend masks provider secrets same as payment.
