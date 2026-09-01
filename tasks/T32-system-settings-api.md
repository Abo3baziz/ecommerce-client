# T32 — System settings API layer (types, client, query keys)

## Goal

Persisted settings plumbing mirroring `src/features/admin/reports-api.ts:10` + `src/lib/api/client.ts:220` patterns — no mock, no static.

## Dependencies

T31 (sidebar), backend T-100..T-104 (endpoints). Can land with mocked fetch then wire.

## Facts

- `apiRequest` at `src/lib/api/client.ts:220` unwrap `{success:true,data}` + CSRF; `http` at `src/lib/api/axios-instance.ts:9`. Query keys `src/lib/api/queryKeys.ts:52` `qk.admin`. Types re-export `src/types/index.ts:7`. Money `string` via `src/components/shared/money.tsx:6`.

## Decisions

- File `src/types/admin-settings.ts` mirrors `src/types/admin-reports.ts:1` (string-union + const arrays). Single source for 9 sections.
- Client `src/features/admin/settings-api.ts` — `getSystemSettings(section?)` `PATCH /admin/settings/:section` with sentinel `__REDACTED__` preserve.

## Implementation

1. `src/types/admin-settings.ts` — export `SystemSettingKey` union (general|commerce|payment|shipping|email|customer|security|admin_permissions|financial), interfaces `GeneralSettings`, `CommerceSettings`, `PaymentSettings`, `ShippingSettings`, `EmailSettings`, `CustomerSettings`, `SecuritySettings`, `AdminPermissionsSettings`, `FinancialSettings`, plus `SystemSettingsMap`.
2. `src/features/admin/settings-api.ts` — `getSystemSettings(section?:string): Promise<Record<string,unknown>>`, `getSystemSection<T>(section): Promise<T>`, `updateSystemSection<T>(section, data): Promise<T>` via `apiRequest` (`url:/admin/settings/${section}`, `method:PATCH`). Helpers `cleanParams` not needed. Secrets: do not transform — backend masks; frontend sends `__REDACTED__` to preserve.
3. `src/lib/api/queryKeys.ts` — add `settings: (section?: string) => ["admin-settings", section ?? "all"] as const`, `settingsHistory: (section?: string) => ["admin-settings-history", section]`.
4. Re-export in `src/types/index.ts`.

## Acceptance criteria

- [ ] `getSystemSettings("general")` 200 SUPER_ADMIN, 403 ADMIN.
- [ ] `updateSystemSection("general", payload)` PATCH 200, audit row with redacted secrets.
- [ ] Types compile strict, `Money` stays string.
- [ ] Query keys invalidate correctly `queryClient.invalidateQueries({queryKey: qk.admin.settings(section)})`.

## Notes

- Secrets never logged; `src/middleware/auditLog.ts:22` pattern extended in backend.
