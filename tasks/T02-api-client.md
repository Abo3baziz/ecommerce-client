# T02 — API Client

## Goal
One shared Axios instance implementing cookie auth, CSRF double-submit, both error-envelope
normalization, and the §3.5 status-handling map. All feature code goes through this.

## Dependencies
T00, T01.

## Reference
`D:\code\ecommerce\docs\api\authentication\csrf.md` (verified flow).

## Implementation

### `src/lib/api/client.ts`
```ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});
```

### CSRF store (`src/lib/api/csrf.ts`)
- In-memory module-level `csrfToken` (never localStorage).
- `fetchCsrfToken()` → `GET /auth/csrf-token`, stores body `data.csrf_token`.
- Called after successful login/register (and opportunistically when session hydrates
  authed but token is missing).
- Cleared on logout/session-expiry.

### Request interceptor
- On `POST/PATCH/PUT/DELETE`: if `csrfToken` present → header `x-csrf-token`.
- Skip when no token stored (public unauthenticated writes register/login need none —
  server skips validation without a session cookie; see csrf.md "What is protected").

### Response/error interceptor → normalizer (`normalizeApiError`)
Turn both shapes into `ApiError { status, code?, message }`:
- `{ error: { code, message } }` → code + message
- `{ success: false, message }` → message, no code
- Non-JSON / network / 5xx → generic message with status.

Status map behavior (emit events, don't navigate here):
- `403` where message/code indicates CSRF failure → **refetch token once and retry the
  original request once**; if it fails again, surface `ApiError`. Use a retry flag on the
  config to prevent loops.
- `401` → emit `session:expired` event (consumed by Session provider in T03 to clear user
  cache + redirect on protected routes). Do nothing further.
- Expose parsed body so pages can map 422 field errors and 429 countdowns.

### Unwrap helper
`apiRequest<T>(config)` returns unwrapped data: if body has `success === true` return
`body.data`; else return body as-is (bare/204). Lists keep top-level `pagination` attached
(re-attach onto result object typed via T01 helpers).

### Query keys factory (`src/lib/api/queryKeys.ts`)
Keyed by **full params objects**, e.g. `qk.products({ search, brand, sort, page })`,
`qk.cart()`, `qk.orders(filters)`, `qk.adminProducts({...})`, `qk.session()`.

### TanStack Query defaults (in providers from T00)
```
retry: (count, err) => ![400,401,403,404,409,422].includes(err.status) && count < 2,
staleTime: 30_000 (tune per module later)
```

## Acceptance criteria
- [ ] Unit tests (vitest + axios-mock-adapter or msw): envelope A/B normalization, bare
      unwrap, 204 unwrap
- [ ] CSRF: header injected on writes when token present; 403-CSRF triggers exactly one
      refetch+retry then surfaces error; no loop
- [ ] 401 emits event once; register/login requests carry no CSRF header pre-session
- [ ] Query key factory covers all modules listed in prompt §10
