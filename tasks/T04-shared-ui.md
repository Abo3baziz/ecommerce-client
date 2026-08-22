# T04 — Shared UI Kit

## Goal
Every reusable display/control component named by prompt §4.4 so feature tasks compose
instead of re-implementing.

## Dependencies
T00 (shadcn base), T01 types.

## Components (`src/components/shared/`)

shadcn primitives to add first: button, input, textarea, label, select, checkbox,
switch, badge, dialog, alert-dialog, dropdown-menu, tabs, table, card, skeleton,
popover, command (for pickers), sonner (toasts).

| Component | Contract |
| --- | --- |
| `<Pagination>` | Accepts either shape from T01: `{totalPages,hasNext,hasPrev}` or reviews' `{has_more}`; renders numbered window + prev/next; controlled `page`/`onPageChange`; disables correctly at bounds |
| `<Money value={Money}>` | Formats decimal string via `Intl.NumberFormat` (USD default, single currency constant); null-safe; never parses for math |
| `<StatusBadge>` | Color-mapped badges for all §3.7 enums: order statuses (lowercase set), VariantStatus, StockStatus (`LOW_STOCK` amber, `OUT_OF_STOCK` red), UserRole/UserStatus; unknown value renders neutral |
| `<Rating>` | Display mode (readonly stars incl. fractional avg) + input mode (interactive, keyboard accessible, clearable) |
| `<EmptyState>` | icon/title/description/action slot |
| `<ErrorState>` | Accepts `ApiError`, message per status (401/403/404/5xx), retry callback |
| `<ConfirmDialog>` | AlertDialog wrapper: title/description/destructive flag/confirm label/onConfirm async w/ pending state |
| `<FormField>` helpers | Zod-driven label+input+inline error wiring used by all forms |
| Toasts | Sonner configured; conventions: success on mutation, error shows `ApiError.message` |

Hooks: `useDebouncedValue(value, 300)`, `useDebouncedCallback`.

Accessibility baseline: labeled inputs, focus-visible rings (shadcn defaults), dialogs
trap focus and restore on close.

## Acceptance criteria
- [ ] `<Pagination>` unit-tested against both pagination shapes (math/bounds/disabled)
- [ ] `<StatusBadge>` snapshot map covers every enum literal; AA contrast on colors
- [ ] `<Rating>` input reachable by keyboard (arrow keys / Enter)
- [ ] Demo page (e.g. `src/app/_dev/ui/page.tsx`, excluded from prod nav) exercises all
      components
