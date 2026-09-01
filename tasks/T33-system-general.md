# T33 — System: General Settings page

## Goal

SUPER_ADMIN global store configuration §2 with cards, validation, maintenance mode, store active/inactive, and dirty guard — no static mock.

## Dependencies

T31, T32, backend T-101.

## Facts

- Backend section `general` exposes 12 fields (store_name, store_description, contact_email, support_phone, store_address, default_language, default_currency, timezone, date_format, maintenance_mode, store_active, logo_url plan). Admin usable ≥1024, `p-6` main `src/app/admin/layout.tsx:22`.

## Decisions

- Layout: 3 cards — Store identity (name, description, logo_url Text+TODO badge), Contact (email, phone, address), Locale & Availability (language, currency, timezone, date format, active switch, maintenance switch danger `border-destructive/40 bg-destructive/5`). Follow `src/app/admin/analytics/page.tsx:91` card grid.
- Validation `zodResolver` mirroring backend Zod (same max lengths, email, E164, URL). `react-hook-form`.
- Maintenance: destructive `ConfirmDialog` on enable; preview `503 maintenance` note. Logo planned only — `Input type=url` with `TODO: ImageKit widget` caption, no upload.

## Implementation

1. Route `src/app/admin/settings/general/page.tsx` — `"use client"`; `useSession` probe → `Skeleton` while `superAdminProbePending`, `ForbiddenCard` if `!isSuperAdmin`; else `<GeneralForm />`.
2. `src/features/admin/settings-components/general-form.tsx` — `useQuery(qk.admin.settings("general"), getSystemSection("general"))` + `useMutation(updateSystemSection)`, `form` with defaults from query, `isDirty` + `beforeunload` + `AlertDialog` unsaved guard (new `src/hooks/use-prevent-navigation.ts`).
3. Save button `disabled={!isDirty || isPending}` `Saving…`, `toast.success`, `invalidateQueries`. `ErrorState` on fetch error, field `setError` on 422 `code`.

## Acceptance criteria

- [ ] SUPER_ADMIN loads, edits, saves; success toast, audit row with who/what/prev/next.
- [ ] ADMIN sees ForbiddenCard, direct URL 403.
- [ ] Zod inline errors for email/phone/timezone/date_format; destructive maintenance behind confirm.
- [ ] Unsaved dirty → navigation prompts.
- [ ] Loading Skeleton, ErrorState retry, mobile stacked.
- [ ] Typecheck/lint/vitest green.

## Notes

- Do not implement logo upload — plan comment only per §2.
