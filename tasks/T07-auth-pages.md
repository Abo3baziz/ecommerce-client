# T07 — Auth Pages

## Goal
Register, Login, logout, and the two email-verification landing routes, with every
documented error state handled.

## Dependencies
T02–T06.

## Reference
`docs/api/authentication/{registration,login,email-verification,session-management}.md`,
`docs/api/authentication/csrf.md`.

## Routes

### `/register` (PublicOnly)
- Fields: `first_name`, `last_name`, `phone_number` (E.164 hint), `email`, `password`
- Zod mirrors §3.6; **live password policy checklist** (8+ chars, upper, lower, digit,
  special) as user types
- Submit `POST /auth/register` → 201 bare `{ public_id, email_verified:false }`
- On success: `fetchCsrfToken()` (new session!) → refresh session query → redirect
  `?from=` or `/`; verify-email banner now visible (T03)
- Errors: 409 email taken / phone taken mapped to fields; 422 password policy inline

### `/login` (PublicOnly)
- Email + password; submit `POST /auth/login`
- 401 → single generic "Invalid email or password" (never differentiate)
- 403 → suspended-account message
- Success: fetch CSRF token → hydrate session → redirect `from` param (admin landing on
  `/admin` if that's where they started)

### `/verify-email?token=…` (public landing — MUST exist; backend emails point here)
- Auto-submit `POST /auth/email-verification/verify { token }` on mount
  - Note per csrf.md: skipped when no session cookie; interceptor handles the authed case
- State machine: verifying → success | 404 unknown token | 410 expired/used
- 410 shows **Resend** CTA → `POST /auth/email-verification/resend`:
  202 "check your inbox" · 409 already verified · 429 rate-limited countdown (disable +
  message)

### `/verify-email-change?token=…`
- Requires session (`AuthGate`); auto-submit `POST /users/me/email/verify { token }`
- 200 success → refresh session/user, show new email confirmed; 410 expired → CTA back to
  `/account/email` to re-request

## Logout
Header menu action wired to T03 util (CSRF header required — covered by interceptor).

## Explicitly NOT built
Any password-reset UI/linking (documented but unimplemented server-side, prompt §12).

## Acceptance criteria
- [ ] Full happy paths E2E against dev backend (register auto-signs-in; login works;
      verify lands succeed via real emailed token in dev logs)
- [ ] Every listed error code renders its specified state
- [ ] Authed users visiting `/login` bounce out (PublicOnly)
