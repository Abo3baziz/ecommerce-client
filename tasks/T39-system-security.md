# T39 — System: Security page (overview + policies)

## Goal

SUPER_ADMIN security posture §8 — session timeout, login attempts, rate limit, password policy, 2FA, notifications, plus clear overview of enabled protections.

## Dependencies

T31, T32, backend T-103.

## Facts

- Backend `security` computes `security_status: hardened|partial|weak` from enabled flags count.

## Decisions

- Top overview card `Card border` with `Badge` `hardened|partial|weak` (`src/components/shared/status-badge.tsx`) + 5 boolean tiles (require 2FA, email verification, login notifications, suspicious alerts, 2FA) green/red.
- Cards below: Session, Rate limiting, Password policy, Admin session, Alerts — each with Inputs/Switches.

## Implementation

1. `src/app/admin/settings/security/page.tsx` — gate, fetch `security` section, render overview computed from response.
2. `src/features/admin/settings-components/security-form.tsx` — Inputs for timeouts/attempts, `Switch` for 2FA/verification/notifications, Zod `max_login_attempts 3-20`, `rate_limit {window_ms,max}`.

## Acceptance criteria

- [ ] Overview badge reflects 5 flags; toggling 2FA updates badge immediately after save.
- [ ] Password policy mirrors `src/shared/validation/index.ts` `passwordField` regex.
- [ ] SUPER_ADMIN only; audit redacted (no secrets here but still).

## Notes

- Dangerous 2FA toggle behind `ConfirmDialog` with warning about ADMIN lockout.
