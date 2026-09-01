# T34 — System: Commerce Settings page

## Goal

SUPER_ADMIN core commerce behavior §3 — tax/VAT, order limits, guest/member rules, cancellation/return, stock threshold — persisted, validated.

## Dependencies

T31, T32, backend T-101.

## Facts

- Fields: tax/vat config, default_tax_rate moneyField, tax_mode inclusive|exclusive, min/max order moneyField, free_shipping_threshold moneyField, allow_guest_checkout, allow_customer_registration, allow_multiple_addresses, cancellation_rules 0-168h, return/refund 0-90d, low_stock_threshold int.

## Decisions

- Cards: Tax, Order Limits (with cross `min ≤ free ≤ max` inline message), Customer Commerce, Order Rules, Inventory.
- Selects for tax_mode, booleans as `Switch`, money as `Input` with string pattern `^\d{1,10}(\.\d{1,2})?$` (copy `product-schemas.ts`).

## Implementation

1. `src/app/admin/settings/commerce/page.tsx` — same gate pattern as T33.
2. `src/features/admin/settings-components/commerce-form.tsx` — Zod `superRefine` cross-check, `useQuery`/`useMutation` `commerce`, dirty guard.
3. Show `Money` preview for limits.

## Acceptance criteria

- [ ] Valid saves 200 + audit; invalid `min>max` shows inline error, no request.
- [ ] All switches/inputs reflect persisted value after reload.
- [ ] ForbiddenCard for ADMIN; SUPER_ADMIN only.
- [ ] Loading/Error/Confirm states per DoD.

## Notes

- Overlap `allow_customer_registration` canonical is Customer page — Commerce reads same key, or duplicate field kept in sync via backend single source (T-101 note).
