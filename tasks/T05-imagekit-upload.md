# T05 — ImageKit Upload Widget

## Goal
Admin-only widget that uploads a picked file **directly from the browser** to ImageKit
using server-signed params, returning the resulting `image_url` for forms.

## Dependencies
T02 (api client), T03 (admin context). Consumed by T15 (product/variant images) and as an
optional helper for review photo URLs (T10/T14 — reviews store plain URLs).

## Reference
- `D:\code\ecommerce\docs\adr\0001-imagekit-client-side-signed-upload.md` (exact upload
  endpoint, form fields, constraints — follow it verbatim)
- Endpoint: `GET /admin/products/uploads/imagekit-auth`

## Flow (prompt §4.5)
1. `GET /admin/products/uploads/imagekit-auth` → `{ token, expire, signature, publicKey, urlEndpoint }`
2. Build multipart FormData per ADR (fileName + signature params) and POST to ImageKit's
   upload API at `urlEndpoint`.
3. On success return the uploaded file URL to the caller via callback/promise.
4. On 401/403 from the auth endpoint → admin-forbidden state; on upload failure → retryable
   error state.

## Widget (`src/components/admin/imagekit-upload.tsx`)
Props: `{ onUploaded(url: string), accept?, maxSizeMb? }`.
States: idle → uploading (progress or spinner; disable submit paths) → done/error(retry).
Validation: image MIME (jpg/png/webp) and max size per ADR; show inline errors.
Implementation: raw `fetch` with FormData (no extra SDK dependency unless ADR prescribes).
Cancel/abort support via AbortController.

## Acceptance criteria
- [ ] Round-trip against dev backend: pick file → signed auth → upload → URL returned
- [ ] Failure paths covered: expired signature, network error, wrong file type/size
- [ ] No secrets logged; widget only rendered inside admin surfaces
