# T14 — Account: Addresses, My Reviews, Sessions

## Goal
Address book CRUD with default toggles, review management, and device/session revocation.

## Dependencies
T10 (review types/components), T02–T06, `<AuthGate>` layout from T13.

## Reference
`docs/api/users/addresses.md`, `docs/api/reviews/reviews.md`,
`docs/api/authentication/session-management.md`.

## Address book `/account/addresses`
- `GET /users/me/addresses` · `POST` · `GET|PATCH|DELETE /users/me/addresses/{id}`
- Cards: label badge, recipient_name, address lines, city/state/country, zip, phone;
  chips **Default shipping / Default billing**
- Create/edit dialog fields (Zod §3.6): recipient_name, phone_number (E.164), label ≤50,
  country, state, city, address_1 ≤255, address_2 ≤255 optional, zip_code ≤20
- Default toggles: setting true elsewhere **auto-unsets others server-side** → refetch the
  fresh list after every mutation and render what came back
- Delete → confirm; 404 → friendly removal from list

## My reviews `/account/reviews`
- `GET /users/me/reviews` — rows show product link, rating, title, excerpt,
  `is_approved` badge (**Pending/Approved**)
- Edit dialog: rating/title/comment + images editor — **replacing images replaces the
  whole set** (`PATCH /reviews/{id}`); warn before discarding existing set
- Delete → confirm; 404 friendly; after edit note re-moderation if applicable
- Link each row to PDP `#reviews`

## Devices & sessions `/account/sessions`
- `GET /auth/sessions` (bare array): device, ip_address, last_activity_at (relative time),
  **"This device"** badge on current session
- Revoke one: `DELETE /auth/sessions/{id}` + confirm
- Revoke all others: `DELETE /auth/sessions` + confirm
- If the revoked session was current (or a later action 401s) → run logout cleanup flow
  (clear cache, redirect login)

## Acceptance criteria
- [ ] Setting a new default visibly unsets the previous default after refetch
- [ ] Image-set replacement warns about whole-set semantics before submit
- [ ] Revoking another session keeps this tab alive; self-revocation path logs out cleanly
