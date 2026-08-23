# T29 — Environment-based CSRF protection toggle

## Goal
Make CSRF protection configurable per environment via `ENABLE_CSRF`, so local
development can exercise APIs without manually handling tokens — while
production stays fully protected by default and **refuses to boot** with the
protection disabled.

## Dependencies
None. Touches only the backend (`D:\code\ecommerce`); frontend requires zero
changes (its automatic token fetching stays correct whether or not the server
validates tokens).

## Grilling decisions (2026-08-23)
- Strict parsing, **default `true`**, hard startup failure on prod+disabled,
  warning log when disabled elsewhere.
- Conditional middleware registration (rate-limiter precedent).
- Test suite unchanged — it keeps exercising real CSRF flows; the variable is
  only *documented* as an escape hatch in `.env.test.example`.
- Docs updated in three places; no frontend changes.

## Facts driving the design
- `csrfProtection` is mounted once on the whole v1 router
  (`src/middleware/csrf.ts` → `routes/v1/index.ts`).
- `skipCsrfProtection` already exempts requests without a session cookie —
  only authenticated writes are validated today.
- `z.coerce.boolean()` is unsafe for this ("false" string coerces to `true`);
  the env var must use an explicit enum transform.
- Precedent for conditional registration exists: rate limiter is skipped when
  `NODE_ENV = "test"`.

## Implementation

### 1. `src/config/env.ts`
```
ENABLE_CSRF: z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true"),
```
Centralized with the existing schema; no hardcoded checks elsewhere.

### 2. Boot guard — `src/index.ts` (or config module)
Fail-closed at startup:
```
if (!env.ENABLE_CSRF && env.NODE_ENV === "production") {
  throw new Error("ENABLE_CSRF=false is not allowed in production");
}
if (!env.ENABLE_CSRF) {
  logger.warn("CSRF protection is DISABLED — development use only");
}
```

### 3. Conditional registration — `routes/v1/index.ts`
```
if (env.ENABLE_CSRF) {
  v1Router.use(csrfProtection);
}
```
`GET /auth/csrf-token` remains registered unconditionally: generating tokens
while validation is off is harmless, and the frontend flow stays identical.

### 4. Env files (backend)
- `.env`: add `ENABLE_CSRF=true` (explicit; dev may flip to false locally).
- `.env.example`: document both values with a comment that production must
  keep `true`.
- `.env.test.example`: add commented-out `# ENABLE_CSRF=false` escape hatch
  for writing new integration tests faster; do NOT change the actual test env
  — existing suites keep exercising real CSRF.

## Documentation
- `docs/api/authentication/csrf.md`: toggle behavior, safe default, prod
  mandate ("must always be enabled in production"), note that the session-
  cookie skip rule is orthogonal.
- `README.md` env table + `docs/TESTING.md` §17 env var list: add the variable
  and its guard behavior.

## Acceptance criteria
- [ ] With `ENABLE_CSRF` unset: behavior identical to today (protection on) —
      verified by an integration-style check that a session-cookie write
      without a token gets 403
- [ ] With `ENABLE_CSRF=false` (dev): authenticated writes succeed without a
      token; sessions, cookies, login/logout, and `/auth/csrf-token` all keep
      working
- [ ] `ENABLE_CSRF=false` + `NODE_ENV=production` → process refuses to start
      with a clear error
- [ ] Frontend untouched and unaffected in both modes
- [ ] All four doc surfaces updated
- [ ] Backend typecheck green; backend suite still NOT run against dev DB
      (T-032)

## Notes
- The toggle gates validation only — token generation, cookies, and session
  auth are independent of it.
- Future enhancement (documented): per-route granularity if ever needed;
  global switch intentionally kept simple.
