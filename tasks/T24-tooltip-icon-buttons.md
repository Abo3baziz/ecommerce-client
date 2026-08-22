# T24 — Hover labels for icon-only buttons

## Goal
Every icon-only button in the app explains itself on hover (and keyboard
focus) via a tooltip. Icon-only controls currently rely on invisible
aria-labels only, which sighted mouse users never discover.

## Interview decisions (2026-08-22)
- Scope: **whole app** (storefront + admin), all ~25 `size="icon"/"icon-sm"`
  call sites.
- Coverage: **icon-only buttons only**; text-labeled buttons stay untouched.

## Approach
1. Add the primitive: `npx shadcn@latest add tooltip` →
   `src/components/ui/tooltip.tsx`. If the generated version does not embed a
   provider, mount a single `TooltipProvider` in `src/app/providers.tsx`.
2. New shared component `src/components/shared/tooltip-icon-button.tsx`:
   wraps `Button size="icon*"` + `TooltipTrigger asChild` +
   `TooltipContent`, taking a required `label: string` plus `side`
   (default `"bottom"` for toolbars/tables, `"top"` where space is tight) and
   forwarding all Button props. One-line adoption per call site; aria-label
   stays (tooltip supplements, never replaces, the accessible name).
3. Sweep call sites with concise verb labels:
   - storefront: header cart/search icons, cart line quantity steppers +
     remove, orders page action, product detail quantity/gallery controls,
     account addresses edit/delete, review-edit dialog controls
   - shared: pagination first/prev/next/last
   - admin: variants tab row actions (expand images/edit/delete),
     product-images and variant-images managers (delete/set-primary),
     reviews moderation row menus, customers row menu trigger
4. Excluded: primitives' internal close buttons (`components/ui/dialog.tsx`)
   and dropdown menu items (already text-labeled when open).

## Acceptance criteria
- [ ] Hovering any icon-only button shows its label within ~300ms; tooltip
      also opens on keyboard focus and closes on Esc
- [ ] No layout shift / clipping inside table rows, dialogs, drawers
      (side chosen per context); portal-rendered content escapes overflow
- [ ] All 25 call sites migrated to the shared component; no stray
      `size="icon"` Buttons without a tooltip remain (grep-verifiable)
- [ ] Disabled buttons either show their tooltip via `disabled={false}` +
      `aria-disabled` pattern where the reason matters, or are consciously
      left without (documented in PR)
- [ ] Typecheck, lint, vitest green

## Notes
- Touch devices: Radix tooltips don't hover — acceptable, since labels exist
  for assistive tech and icon targets stay tappable; do NOT gate actions
  behind tooltips.
- Out of scope: tooltips on ambiguous TEXT buttons, shortcut-hint badges.
