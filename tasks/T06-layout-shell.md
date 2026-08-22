# T06 — Layout Shells

## Goal
Storefront chrome (header/footer) and the admin sidebar shell, including cart indicator
and navigation data.

## Dependencies
T02, T03, T04. (T05 not required.)

## Storefront shell (`src/app/(storefront)/layout.tsx`)

### Header
- Logo → `/`
- **Search box**: debounced 300ms → `router.push('/products?search=…')`; Enter navigates
- **Categories menu**: dropdown fed by `GET /categories` (active only, server-sorted by
  name) → links `/categories/{id}`; also rendered as footer links
- **Cart indicator**: badge with `items_count` from `GET /cart` query; treat 404 (no cart
  yet) and anonymous users as `0`/hidden — never an error state
- **Account menu** (`useSession`): signed-out → Login/Register; signed-in → Account,
  My orders, Devices & sessions, Logout (T03 util); ADMIN/SUPER_ADMIN additionally see
  "Admin Console" link

### Footer
Category links + static text links; no invented pages (prompt §12).

## Admin shell (`src/app/admin/layout.tsx`)
- Wrapped in `<AdminGate>` (T03)
- Sidebar nav: Dashboard `/admin`, Products, Categories, Inventory, Orders, Reviews,
  Customers — active-route highlighting via `usePathname`
- Top bar: back-to-storefront link + account menu (reuse)
- Content region usable at ≥1024px; sidebar collapses on smaller widths

## Shared bits
- Skip-to-content link; focus moves to main heading on route change (a11y §11)
- Zustand UI store (`src/stores/ui-store.ts`) for future mini-cart/toast state (used T09)

## Acceptance criteria
- [ ] Header search debounces to one navigation per pause; preserves other query params
      when already on `/products`
- [ ] Cart badge reflects add-to-cart after cache invalidation (verified manually once a
      later task adds items; stub-safe before)
- [ ] Admin nav hidden from CUSTOMER at DOM level (not just CSS)
- [ ] Keyboard: menus operable, focus rings visible
