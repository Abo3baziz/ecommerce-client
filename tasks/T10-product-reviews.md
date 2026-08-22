# T10 — Product Reviews

## Goal
PDP reviews experience (summary, filtered list, write form) plus the single-review
deep-link route; user edit/delete lives in My reviews (T14).

## Dependencies
T09 (PDP shell), T02–T06.

## Reference
`docs/api/reviews/reviews.md`.

## Endpoints
- `GET /products/{id}/reviews` — params `rating` (1–5 filter), `sort`
  (`-created_at | -rating`), `page`, `limit`; **pagination shape `{ page, limit, total, has_more }`**
- `GET /reviews/{review_public_id}` — deep link
- `POST /reviews { product_public_id, rating, title, comment, images[] }`

## PDP reviews section (`#reviews`)
- Summary card: `average_rating`, total count
- Rating filter chips: All + 1–5 (URL-synced)
- Sort select (`-created_at` default, `-rating`)
- `<Pagination>` in `has_more` mode (T04 dual-shape support)
- Review card: customer_name, `<Rating>`, title, comment — **rendered as text, never HTML**
  (sanitize-by-construction), images grid (lazy), formatted date

### Write review (authed)
- CTA opens form/dialog: star input, title ≤255, comment ≤5000 with counter, up to 5 photo
  URLs (plain URL inputs + optional T05 upload helper that pastes the URL)
- Success → invalidate reviews + summary; show "submitted for moderation" note
- **409 already reviewed** → info alert linking to `/account/reviews` for editing
- Unauthed CTA → login redirect w/ return

## Deep link `/reviews/[reviewId]`
Minimal page rendering one review via `GET /reviews/{id}` (+ link back to its product);
404 friendly.

## Acceptance criteria
- [ ] Filter chips + sort update URL and refetch; pagination respects `has_more`
- [ ] 409 flow verified against a double review attempt
- [ ] Comment content with HTML/script strings displays inert as text
