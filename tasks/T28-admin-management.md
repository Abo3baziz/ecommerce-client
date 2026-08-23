# T28 — Admin Management section (super-admin)

## Goal
A super-admin-only **Admin Management** section: enumerate and manage admin
accounts (view profile, activate/deactivate, role change) and monitor their
activity using the T22 audit log as the single source of truth. Regular
admins never see the section and receive `403` from every underlying API.

## Dependencies
T22 (audit logs + read API), existing `/admin/users/{id}/role` endpoint,
sessions table (`created_at`, `last_activity_at`). Independent of T26/T27.

## Grilling decisions (2026-08-23)
- **Backend shape**: dedicated module at `/admin/admins` — the existing
  `/admin/users` surface deliberately scopes to CUSTOMERs (404 on admins);
  extending it would weaken that boundary. Customer endpoints stay untouched.
- **Inactive definition**: an admin with **no login AND no audit-logged action
  within the last 2 days** shows `INACTIVE`; otherwise `ACTIVE`. Accounts with
  `status = SUSPENDED` always render `SUSPENDED` regardless of recency.
  Threshold lives in shared constants (`ADMIN_INACTIVE_AFTER_DAYS = 2`) so
  it stays tunable.
- **Activity view**: per-admin drawer inside the section, backed by the
  existing `GET /admin/audit?actor=…` endpoint (single source of truth — no
  duplicated log query paths).
- **Role scope v1**: role change reuses the existing guarded
  `/admin/users/{id}/role` endpoint (promote CUSTOMER↔ADMIN); granular
  permissions/RBAC remain documented future work.

## Backend contract — `/api/v1/admin/admins`
All endpoints require `SUPER_ADMIN` (regular admins → `403`). Mutations are
auto-audited by the T22 middleware.

| Endpoint | Purpose |
| --- | --- |
| `GET /admin/admins` | List role IN (ADMIN, SUPER_ADMIN): `page`, `limit`, `search` (name/email), `status` (ACTIVE\|SUSPENDED), `activity` (ACTIVE\|INACTIVE), `sort` (name, created_at, last_login_at; default `-last_login_at`) |
| `GET /admin/admins/{public_id}` | Profile detail incl. activity aggregates |
| `PATCH /admin/admins/{public_id}/suspend` | Suspend admin + revoke all their sessions (transactional); guards below |
| `PATCH /admin/admins/{public_id}/activate` | Reactivate a suspended admin |
| role changes | Reuse existing `PATCH /admin/users/{public_id}/role` |

Row payload:
```
{ public_id, first_name, last_name, email, phone_number, role,
  status,                      // ACTIVE | SUSPENDED   (account status)
  activity_status,             // ACTIVE | INACTIVE    (derived, 2-day rule)
  last_login_at,               // MAX(sessions.created_at), null = never
  last_activity_at,            // MAX(sessions.last_activity_at)
  last_action_at,              // latest audit_logs.created_at for actor
  last_action_type,            // its action name
  created_at }
```

Guards (mirroring existing rules): a super admin cannot suspend/demote
themselves; the SUPER_ADMIN account can never be suspended, demoted or have
`is_current`-style protections bypassed; suspending revokes all of that
admin's sessions transactionally. Errors: `400` self-target/invalid,
`403` non-super-admin, `404` unknown id, `409` guard violation (e.g. demote
would leave zero admins — existing rule).

Implementation notes: aggregates via LEFT JOIN + MAX over `sessions` /
`audit_logs` grouped per admin (one raw-SQL list query, matching repo
conventions); activity derivation happens in SQL where possible with the
2-day constant bound as a parameter. No schema migration needed.

Docs: new `docs/api/admin/admins.md`.

## Frontend — `/admin/admins` ("Admin Management")
- New sidebar group **Admin Management** (ShieldCheck icon), item "Admins" —
  rendered only when the `isSuperAdmin` probe passes; routes wrapped in
  `SuperAdminGate`.
- List: debounced search, account-status select, activity-status select,
  sortable headers, pagination. Columns: name/email · role badge · account
  status · activity indicator (green/grey dot + label) · last login · last
  action · created.
- Detail drawer (row click): profile card + tabs — *Profile* (contact,
  role, timestamps) and *Activity* (reuse `listAdminAudit({actor})`: action,
  entity, timestamp; links into global Audit log).
- Actions in drawer: Suspend/Reactivate (ConfirmDialog noting session
  revocation) and Change role (CUSTOMER↔ADMIN) — disabled for own row and
  for the SUPER_ADMIN account, server enforces regardless.
- DoD states throughout; responsive down to mobile.

## Spec updates
FRONTEND_PROMPT route table gains `/admin/admins` (SUPER_ADMIN only);
tasks/index registered.

## Acceptance criteria
- [ ] Regular ADMIN: no nav entry, direct URL → forbidden card, every
      `/admin/admins*` call → 403 (server-side check verified via curl)
- [ ] List shows all ADMIN/SUPER_ADMIN accounts with correct last-login /
      last-action aggregates; 2-day inactivity boundary verified (23h vs
      25h-old activity)
- [ ] Suspend revokes the admin's sessions immediately and flips their
      status; reactivate restores; self-suspend and SUPER_ADMIN-target
      attempts blocked client- AND server-side
- [ ] Activity drawer reflects real audit entries filtered by actor
- [ ] Mutations appear in the audit trail via the standard middleware
- [ ] Typecheck/lint/vitest green (client); backend typecheck green; backend
      suite still NOT run against dev DB (T-032)

## Notes
- Scalability: the section is a consumer of `audit_logs`, not a second
  writer; future RBAC tables, login-history views, and anomaly detection can
  plug into the same `/admin/admins` module without contract breaks.
- Out of scope: granular permissions matrix, password reset-on-behalf,
  admin impersonation, export/CSV.
