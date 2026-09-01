# T35 — System: Payment Settings page (masked secrets)

## Goal

SUPER_ADMIN payment configuration §4 — enable methods (COD/card), provider config, test/live, currency restrictions, failure behavior, min/max transaction — secrets masked, never plain text per §4/§11.

## Dependencies

T31, T32, backend T-102.

## Facts

- Backend `payment` section encrypts `provider_secret_key`, `webhook_secret`; GET masks `"[redacted]"`; PATCH `__REDACTED__` preserves.

## Decisions

- UI: Enabled methods `Checkbox` group, COD/Card `Switch`, Provider `Select` (stripe/paymob/manual), Test mode `Switch`, Currency restrictions multi-Select `REPORT_CURRENCIES`, Failure behavior `Select`, Min/Max money Inputs.
- Secrets inputs `type="password"` with `Eye` toggle + masked placeholder `"••••••••"` when `value==="__REDACTED__"`; never show decrypted value after load.

## Implementation

1. `src/app/admin/settings/payments/page.tsx` — gate + `payments` form.
2. `src/features/admin/settings-components/payment-form.tsx` — map backend masked sentinel to UI placeholder; on submit, if user left placeholder, send `__REDACTED__` else new secret; validate new secret `min 1` if changed.
3. Danger section for disabling all methods behind `ConfirmDialog destructive`.

## Acceptance criteria

- [ ] GET shows masked secrets; raw never in DOM or network preview after load.
- [ ] Saving with placeholder preserves cipher; saving new secret encrypts (check audit redacted).
- [ ] ADMIN 403, SUPER_ADMIN 200.
- [ ] 422 on bad currency/min>max.

## Notes

- §4: “Do not expose sensitive payment credentials as plain text” — strictly enforced frontend + backend.
