# T38 — System: Customer Settings page

## Goal

SUPER_ADMIN customer behavior §7 — registration, verification, password, session, reviews, deletion — persisted.

## Dependencies

T31, T32, backend T-103.

## Facts

- 10 fields: allow_registration, require_email_verification, require_phone_verification, password_requirements, session_duration, max_active_sessions, allow_account_deletion, allow_reviews, review_moderation, purchase_gated_reviews.

## Decisions

- Cards: Registration & Verification (3 switches), Password (min_length + 4 requirement switches), Session (duration + max sessions), Reviews & Deletion (3 toggles).
- Password preview shows policy string like `Min 8, upper+digit`.

## Implementation

1. `src/app/admin/settings/customers/page.tsx` — gate.
2. `src/features/admin/settings-components/customer-form.tsx` — Zod validates `password_min_length 8-128` + at least one requirement; `session_duration_ms` coerce; `max_active_sessions 1-10`.

## Acceptance criteria

- [ ] All 10 fields persist, reload reflects value, audit diff correct.
- [ ] Password requirements validation inline.
- [ ] ADMIN ForbiddenCard, SUPER_ADMIN only.

## Notes

- Feeds `src/modules/auth` validators at runtime — service layer applies settings on registration/login.
