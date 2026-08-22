# T22 — Admin audit logging

## Goal
Every action an administrator performs is recorded in an append-only audit
trail, viewable by the super admin: all mutating requests under `/admin/*`
(captured automatically), plus security-relevant auth events of admin
accounts (login success/failure, logout, session revocations). Supersedes the
"structured logger only" approach noted in `docs/api/admin/admin.md` Notes and
used by role changes today; also gives T21's reserve changes a durable trail.

## Dependencies
None hard; lands naturally after/with T21. Backend-only schema addition —
project uses `prisma db push` (no migrations dir).

## Interview decisions (2026-08-22)
- **Auto-middleware capture** on `/admin/*` non-GET requests: actor, route,
  redacted body snapshot, IP/UA, response status — future endpoints covered
  with zero extra code.
- **Viewer**: new `/admin/audit` page, SUPER_ADMIN only.
- **Auth events included**: admin login success/failure, logout, session
  revocation (self/others/suspend-triggered).
- **Retention**: keep forever, append-only (no update/delete paths anywhere).

## Backend

### Schema — `audit_logs`
```
id             Int       @id @default(autoincrement())
public_id      String    @unique VarChar(32)
actor_users_id Int?      // null when no account matched (failed login)
action         String    VarChar(100)   // e.g. "admin.products.update", "auth.admin.login_failed"
entity_type    String?   VarChar(50)    // product|variant|product_image|variant_image|category|inventory|order|review|customer|session
entity_public_id String? VarChar(50)
method         String    VarChar(10)
path           String    VarChar(255)
status_code    Int
request_body   Json?     // deep-redacted copy of req.body
ip_address     Inet?
user_agent     String?
created_at     DateTime  @db.Timestamptz(6)

indexes: created_at · (actor_users_id, created_at) · action · (entity_type, entity_public_id)
relation: users (optional; rows survive account deletion)
```

### Capture middleware (`src/middleware/auditLog.ts`)
- Mounted on the admin routers (or a `/admin` branch in `routes/v1`) for
  methods POST/PATCH/PUT/DELETE.
- On `res.on("finish")`: insert one row — fire-and-forget; failures are logged
  via pino and NEVER fail the audited request.
- Entity extraction from path patterns (products/variants/images/category/
  inventory/orders/reviews/users); semantic `action` naming with special cases:
  `.../role` → `admin.users.role_change`, `/suspend`, `/activate`,
  inventory `.../reserve` → `admin.inventory.reserve` (T21), orders PATCH →
  `admin.orders.status_transition`.
- Redaction: recursively drop keys matching `/password|secret|token/i` from the
  body snapshot before persisting.
- GETs are not audited (reads stay out of scope this round).

### Auth events (explicit writes in auth service)
Small helper `auditService.record(...)` reused by middleware and service code;
only fires when the involved account is ADMIN/SUPER_ADMIN (or unknown email on
failure): `auth.admin.login`, `auth.admin.login_failed`, `auth.admin.logout`,
`auth.admin.sessions_revoked`. Suspend-triggered revocation is already visible
via the suspend entry — no duplicate event.

### Read API — `GET /api/v1/admin/audit`
SUPER_ADMIN only. Params: `page`, `limit`, `actor` (user public_id),
`action` prefix match, `entity_type`, `entity_public_id`, `date_from`,
`date_to`, `sort` (`created_at` only, `-` default). Returns entries joined
with current actor name/email + standard pagination. Documented in a new
`docs/api/admin/audit.md`.

## Frontend
- Types: `AdminAuditEntry`, `AdminAuditListParams`; `qk.admin.audit(params)`;
  `features/admin/audit-api.ts`.
- `/admin/audit`: table (time, actor, action badge, entity link when resolvable,
  method+path, status chip), filters (actor search, action prefix select,
  date range), detail drawer (pretty JSON payload, IP/UA, ids).
- Sidebar gains "Audit log" gated to super admins: session exposes no role, so
  reuse the probe pattern (`GET /admin/audit?limit=1` → allowed vs 403) next to
  the existing `isAdmin` probe in `session-context.tsx`.
- Definition-of-Done states apply (skeletons, empty state, error retry,
  URL-persisted filters).

## Acceptance criteria
- [ ] Every POST/PATCH/DELETE under /admin/* produces exactly one audit row
      with correct actor, entity, status; bodies redacted
- [ ] Role change, suspend, activate, order transition, reserve produce
      semantic actions; failed admin logins recorded with attempted email
- [ ] Audit insert failure never breaks the business request (log-only)
- [ ] Non-super-admin gets 403 from read API; page hidden + guarded
- [ ] No update/delete path exists for audit rows; retention = forever
- [ ] Typecheck, lint, tests green (client); backend typecheck green;
      backend test suite still NOT run against dev DB (T-032 wipe hazard)

## Notes
- Storage growth acceptable at this scale (~26 mutation endpoints, internal
  tool traffic); revisit partitioning if volume ever justifies it.
- Out of scope: before/after field diffs, CSV export, alerting.
