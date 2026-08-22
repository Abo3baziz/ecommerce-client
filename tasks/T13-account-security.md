# T13 — Account: Profile & Security

## Goal
Profile editing and the credential-change flows (password, email, phone) plus account
deletion — each with its full error-code handling.

## Dependencies
T07 (verify-email-change landing), T02–T06.

## Reference
`docs/api/users/users.md`, `docs/api/authentication/session-management.md`,
`docs/api/users/{change-password,change-email,change-phone}.md`.

Layout: `/account` with sub-nav (profile, password, email, phone, addresses → T14,
reviews → T14, sessions → T14, danger zone). All pages inside `<AuthGate>`.

## Profile `/account`
`GET /users/me` + `PATCH /users/me { first_name, last_name }` inline form; success toast;
session user cache updated.

## Change password `/account/password`
- current + new + confirm; Zod policy §3.6
- Warning text: **other sessions will be logged out**
- `PATCH /users/me/password` → 401 `INVALID_CURRENT_PASSWORD` mapped to current field ·
  422 policy · 429 limiter → disable submit + countdown

## Change email `/account/email`
- new_email + current password → `POST /users/me/email`
- 202 → persistent pending banner ("check your inbox; link expires"); explain the emailed
  link lands on `/verify-email-change?token=…` (built in T07); 410 there offers re-request
- 409 email taken / 422 validation mapped inline; 429 countdown
- Note: credential rotation invalidates pending tokens (AUTHENTICATION.md) — mention in UI copy

## Change phone `/account/phone-number`
- Show current number; new number form → `POST /users/me/phone-number` sends SMS OTP
  (**dev: OTP printed in server logs**)
- OTP entry modal (6-digit input) → `POST /users/me/phone-number/verify { otp }`
- Errors: 422 wrong code inline · 429 attempts exhausted · 410 expired → resend CTA;
  success refreshes session user

## Delete account — Danger zone `/account` bottom card
- `<ConfirmDialog>` requiring current password typed to enable confirm
- `DELETE /users/me` (CSRF) → hard logout: clear csrf token + `queryClient.clear()` →
  redirect home; irreversible warning copy

## Acceptance criteria
- [ ] Each documented status per flow renders its specified state (incl. 429 countdowns)
- [ ] Password change invalidates other sessions gracefully (current session survives)
- [ ] Email/phone flows complete end-to-end against dev backend using logged OTP/dev mailbox
- [ ] Delete account logs out fully; subsequent session query reports unauthenticated
