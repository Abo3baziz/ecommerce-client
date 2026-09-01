# T37 — System: Email & Notifications page

## Goal

SUPER_ADMIN notification matrix §6 + sender/provider/test email — 11 toggles + 5 provider fields, persisted.

## Dependencies

T31, T32, backend T-103.

## Facts

- Backend `email` section `notifications Json` with 11 booleans, `sender_name`, `sender_email`, `provider`, `provider_config` masked (`smtp_password`), `test_email`.

## Decisions

- Cards: Sender (name, email), Provider (enum + masked config), Notifications (11 `Switch` with descriptions), Test email (Input + `Send test` Button `POST /admin/settings/email/test` or reuse mutation that triggers backend test send).

## Implementation

1. `src/app/admin/settings/email/page.tsx` — gate.
2. `src/features/admin/settings-components/email-form.tsx` — grid `Switch` per notification; provider `Select` switches config fields; test button calls `apiRequest({url:"/admin/settings/email/test", method:"POST", data:{to:test_email}})`, shows `toast`.
3. Mask `smtp_password` same pattern as payment.

## Acceptance criteria

- [ ] Toggling any of 11 notifications persists, shows audit `changes: {notifications.order_placed: {from:false,to:true}}`.
- [ ] Sender email validates; test email button shows success/error toast.
- [ ] Secrets masked; ADMIN 403.

## Notes

- If `POST /admin/settings/email/test` not in backend T-103, add it in same PR (thin controller calls `resend`/`smtp` provider with masked config decrypted server-side).
