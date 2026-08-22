# T23 — Password reset via OTP

## Goal
Users who forgot their password reset it through an emailed **6-digit code**
while keeping the existing emailed **link** as a fallback — either completes
the reset. Adds the previously out-of-scope frontend reset screens as one
wizard, extends the backend contract, and amends the specs that excluded this
flow (FRONTEND_PROMPT §12, tasks DoD note).

## Dependencies
T07 (auth pages, password policy hint), backend auth module.
Existing pieces reused as-is: link-based `POST /auth/password-reset(/verify)`
and the backend-served static `/reset-password` page (stays working).

## Interview decisions (2026-08-22)
- Email carries **both** code and link; either completes the reset.
- Frontend is **one wizard page** `/forgot-password` (steps in `?step=`).
- Standard hardening bundle (see contract).
- Full stack + spec updates, tracked here as T23.

## Backend contract changes (`D:\code\ecommerce`)

### Issuance — `POST /auth/password-reset` (existing, extended)
- Body `{ email }`; responds `202` unconditionally (no account enumeration).
- Now creates **two** `PASSWORD_RESET` rows atomically: the long link token
  (unchanged behavior) and a 6-digit numeric code; both hashed, same 15-min
  TTL. New request invalidates all prior unused reset rows for the account.
- Email renders the code prominently (large, monospace) above the existing
  link/button block.
- Resend = calling the endpoint again; server-side limiter enforces 60s
  cooldown per email (429 otherwise), mirroring the email-verification
  resend limiter.

### Code verification — `POST /auth/password-reset/otp/verify` (new)
- Body `{ email, code }` → validates against the unused/unexpired OTP row,
  `200 { reset_token }` returning the account's link-token value so step 3
  reuses the EXISTING `POST /auth/password-reset/verify` unchanged (keeps its
  side effects: revoke other sessions, sweep pending CHANGE_EMAIL/
  CHANGE_PHONE_NUMBER/PASSWORD_RESET tokens in one transaction).
- Wrong/expired/used code → `401` with `attempts_remaining` in the body;
  after 5 failed attempts the OTP row dies (subsequent tries → `410`).
  Requires new `failed_attempts Int @default(0)` column on
  `password_reset_tokens` (db push, no migrations dir).

### Security parameters (locked)
6-digit numeric · 15-min expiry · max 5 wrong attempts kill the code · 60s
resend cooldown · single active set per account · completion side effects
unchanged. Generic errors everywhere; never reveal whether the email exists.

### Docs
Update `docs/api/authentication/password-reset.md`: dual-channel issuance, new
OTP endpoint, attempts semantics; note the static page remains the link target.

## Frontend — `/forgot-password` (new, `(landing)` group)
Public wizard, steps persisted via `?step=`, no codes/tokens ever in URLs:
1. **Email** — single field; submit → 202 → advance regardless of which email
   was typed (anti-enumeration copy: "If the address exists, a code is on its
   way"). Resend button appears with 60s countdown (client mirror of the 429).
2. **Code** — 6-box digit input (reuse phone-OTP dialog input pattern),
   paste-friendly; submit `otp/verify`, map 401 → inline error +
   attempts_remaining warning, 410 → back to step 1 with expired notice.
3. **New password** — password + confirm with the live strength/policy hint
   from register; submits existing `/auth/password-reset/verify` with the
   exchanged `reset_token`; success card → link to `/login`.
- Route added to FRONTEND_PROMPT route table; login page gains
  "Forgot password?" link.
- Spec amendments: remove "password-reset screens" from FRONTEND_PROMPT §12
  and the tasks/index.md out-of-scope note.

## Acceptance criteria
- [ ] Requesting a reset emails both code and link; old static link flow still
      completes a reset end-to-end
- [ ] Wizard completes via code path: email → code → new password → login
      works; other sessions revoked after reset
- [ ] 5 wrong codes invalidate the OTP; 429 on resend within 60s; responses
      never reveal account existence
- [ ] Completing reset invalidates pending change-email/phone/reset tokens
      (existing transaction preserved)
- [ ] Specs amended (FRONTEND_PROMPT §12/route table, backend password-reset.md)
- [ ] Typecheck/lint/tests green client-side; backend typecheck green; backend
      suite still NOT run against dev DB (T-032)

## Notes
- No breaking change: `password-reset/verify` contract untouched; OTP verify
  merely exchanges a code for the same reset token.
- Out of scope: SMS delivery (no provider), remembered-device bypass,
  admin-triggered resets.
