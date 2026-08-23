# T30 — ImageKit upload hardening (folders, validation, audit edges)

## Goal
Close the remaining gaps in the **already-implemented** ImageKit direct-upload
architecture: server-controlled folder organization, enforced file validation,
and audit coverage for customer review photos. No reimplementation of the
existing auth-endpoint / direct-upload / dropzone flow.

## Dependencies
None hard; builds on T22 (audit) and existing `ImageUploadDropzone` usage.

## Facts — what already exists (verified 2026-08-23)
- Backend auth endpoints: `GET /uploads/imagekit-auth` (any authenticated
  role, incl. customers for reviews) and `GET /admin/products/uploads/
  imagekit-auth`; return token/expire/signature/publicKey/urlEndpoint via the
  shared SDK util. Private key never leaves the server.
- Frontend: `fetchImageKitAuth` + `uploadToImageKit` (XHR progress callback,
  abort signal, 401-credentials-expired mapping) + shared
  `ImageUploadDropzone` used by product images, variant images, and review
  dialogs.
- References land in resource tables (`product_images`, `variant_images`,
  review images) via existing endpoints.
- Admin-side image mutations are auto-audited by the T22 middleware.

## Grilling decisions (2026-08-23)
- Scope: **gap-closing only** (folders, validation, audit edges). No rebuild.
- Folders: **allowlisted `folder` query param** on the auth endpoints;
  server validates against a per-caller map and returns it in the payload;
  client passes it into the ImageKit upload form; save-time validators
  double-check the resulting URL prefix.
- **No standalone uploads ledger** in v1 — resource tables remain the source
  of truth; a parallel ledger adds sync burden with little value.
- Validation split: frontend enforces type/size pre-selection for UX;
  backend enforces URL host + folder prefix + extension whenever an upload
  reference is saved. Byte-level checks are impossible with direct uploads —
  that responsibility sits with ImageKit account settings (documented).
- Audit edges: add explicit `review.image_added` / `review.image_removed`
  events for customer review photos (routes outside `/admin/*`, hence not
  auto-covered).

## Implementation

### Backend (`D:\code\ecommerce`)
1. Folder allowlist + issuance:
   - Shared map: `reviews → ecommerce/reviews`, `products → ecommerce/products`.
   - Both auth endpoints accept `?context=reviews|products`; response gains
     `folder`. Unknown/missing context → default per endpoint scope
     (admin products endpoint defaults to products; customer one to reviews).
   - `getUploadAuthenticationParameters()` call unchanged (signature covers
     expire+token); folder is passed by the client to the upload form.
2. Reference-save validator (shared util, applied at every point that persists
   an uploaded image URL):
   - URL must start with configured `IMAGEKIT_URL_ENDPOINT`
   - path must start with the allowed folder for that context
   - extension ∈ jpg | jpeg | png | webp
   - violations → 422 `INVALID_UPLOAD_URL`
3. Customer review flows: emit `review.image_added` /
   `review.image_removed` audit events (actor = customer, entity = review,
   body carries url + folder) via the existing `recordAuditEvent`.

### Frontend
1. Dropzone constants: accept `image/jpeg,image/png,image/webp`, max size
   **5 MB** — validated on selection with inline messages before any network
   activity.
2. Failed uploads keep the selected file and expose a **Retry** button
   (re-runs auth fetch if credentials expired).
3. Pass the caller's context/folder through `fetchImageKitAuth` → upload form.
4. Types: extend `ImageKitAuthParams` with `folder`.

## Acceptance criteria
- [ ] Uploads from product/variant/review flows land under their mapped
      ImageKit folders
- [ ] Saving a reference whose URL is off-host, outside the folder, or with
      a disallowed extension fails with `422 INVALID_UPLOAD_URL`
- [ ] Oversized/wrong-type files are rejected client-side before upload
- [ ] Failed upload shows retry affordance; successful flow unchanged
      (progress %, cancel)
- [ ] Review photo add/remove produces audit rows; admin image mutations keep
      their single auto-audit row (no duplicates)
- [ ] Typecheck/lint/vitest green (client); backend typecheck green; backend
      suite still NOT run against dev DB (T-032)

## Notes
- Scalability: adding a future context (e.g. `users` avatars, `categories`)
  = one allowlist entry + one dropzone wiring; storage-provider abstraction
  intentionally not built until a second provider exists.
- Out of scope: standalone uploads ledger table, server-side virus/malware
  scanning, image transformation pipelines.
