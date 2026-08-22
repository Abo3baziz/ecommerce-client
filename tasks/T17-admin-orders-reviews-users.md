# T17 — Admin: Orders, Review Moderation, Customers

## Goal
Orders dashboard with legal-transition-only status actions, the review moderation queue,
and customer management with SUPER_ADMIN-gated role control.

## Dependencies
T02–T06, T12 (customer order display components), T15/T16 (admin conventions).

## Reference
`docs/api/admin/admin.md`, `docs/api/orders/orders.md`, `docs/api/reviews/reviews.md`,
`docs/api/users/users.md`.

## `/admin/orders` — List
- Table: order_number, customer (name/email), `<StatusBadge>`, placed_at, total_amount
- Filters: status select (all + 8 statuses), search debounce (number/customer),
  date-range `placed_from`/`placed_to` **with from ≤ to validation**, sort incl.
  `customer_name`, `-total_amount`; pagination

## `/admin/orders/[orderId]` — Detail
- Everything the customer sees — reuse T12 components (items/address/payment/totals/notes)
  plus admin projection extras:
  - **Customer summary card** (public id, names, email)
  - **Shipment card**: carrier, tracking_number, shipped_at, delivered_at
- **Status action bar** — encode the transition matrix; render ONLY legal next steps:

  | From | Allowed |
  | --- | --- |
  | pending | confirmed · cancelled |
  | confirmed | processing · cancelled |
  | processing | shipped · cancelled |
  | shipped | delivered |
  | delivered | returned |
  | returned | refunded |
  | cancelled / refunded | none (terminal) |

- Shipping requires **carrier** (required input) + optional tracking in a small modal;
  cancel/return/refund show confirm dialogs noting side effects (stock release / refund
  recorded server-side)
- `PATCH /admin/orders/{id}` per transition body from orders.md; 409 illegal/no-op →
  graceful toast + refetch detail

## `/admin/reviews` — Moderation queue
- Table: product, rating, title/excerpt, customer, `is_approved` badge, deleted rows dimmed
  under include_deleted
- Filters: search (product/title/comment/customer/email), rating select,
  `is_approved=true|false|all`, sort; pagination
- Actions: approve/unapprove toggle (`PATCH … { is_approved }`, optimistic w/ rollback) ·
  edit dialog rating/title/comment (**images read-only here**) · soft delete w/ confirm
- Detail drawer: full comment, images grid, customer_email

## `/admin/users` — Customers
- Table: name, email, phone, status badge, email_verified check, created_at
- Controls: search, status filter (ACTIVE/SUSPENDED/DELETED), include_deleted, sort
- Edit dialog: first/last name, email, phone → 409 duplicates / 422 validation mapped
- Actions:
  - Suspend / Activate with confirms (suspend revokes sessions server-side); 400
    already-in-state → toast
  - **Role control visible only to SUPER_ADMIN** (`PATCH /admin/users/{id}/role`
    CUSTOMER↔ADMIN): promote/demote confirm dialog; surface 400 self-change, 403
    non-super-admin, 409 last-admin protection

## Acceptance criteria
- [ ] Illegal transitions are never rendered as buttons; attempted-race 409s handled
- [ ] Ship flow blocks submission without carrier
- [ ] ADMIN viewer cannot see role controls at all; SUPER_ADMIN can promote/demote
- [ ] Moderation toggle reflects instantly and reverts on failure
