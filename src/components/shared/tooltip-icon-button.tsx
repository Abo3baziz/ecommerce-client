"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export interface TooltipIconButtonProps
  extends React.ComponentProps<typeof Button> {
  /** Visible on hover and keyboard focus; also keep aria-label semantics. */
  label: string;
  side?: TooltipSide;
}

/**
 * Icon-only button with an explanatory hover/focus label. Use for every
 * `size="icon"` / `size="icon-sm"` button so sighted mouse users can discover
 * the action; the tooltip supplements (never replaces) the accessible name.
 */
export function TooltipIconButton({
  label,
  side = "bottom",
  children,
  ...buttonProps
}: TooltipIconButtonProps) {
  const { "aria-label": ariaLabel, ...rest } = buttonProps;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={ariaLabel ?? label} {...rest}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
