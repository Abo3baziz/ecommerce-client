"use client";

import { cn } from "@/lib/utils";
import type { CustomerVariant } from "@/types";

type Dimension = "color" | "size";

function uniqueValues(variants: CustomerVariant[], dimension: Dimension): string[] {
  const seen = new Set<string>();
  for (const variant of variants) {
    const value = variant[dimension];
    if (value !== null && value !== "") {
      seen.add(value);
    }
  }
  return Array.from(seen);
}

interface VariantPickerProps {
  variants: CustomerVariant[];
  selected: CustomerVariant | null;
  onSelect: (variantPublicId: string) => void;
}

export function VariantPicker({
  variants,
  selected,
  onSelect,
}: VariantPickerProps) {
  const colors = uniqueValues(variants, "color");
  const sizes = uniqueValues(variants, "size");

  if (colors.length === 0 && sizes.length === 0) {
    return null;
  }

  function isOptionDisabled(dimension: Dimension, option: string): boolean {
    const other: Dimension = dimension === "color" ? "size" : "color";
    const otherValue = selected?.[other] ?? null;
    return !variants.some(
      (variant) =>
        variant[dimension] === option &&
        (otherValue === null || variant[other] === otherValue),
    );
  }

  function selectOption(dimension: Dimension, option: string) {
    const other: Dimension = dimension === "color" ? "size" : "color";
    const otherValue = selected?.[other] ?? null;
    const withOption = variants.filter(
      (variant) => variant[dimension] === option,
    );
    const matchingOther =
      otherValue !== null
        ? withOption.filter((variant) => variant[other] === otherValue)
        : [];
    const next = matchingOther[0] ?? withOption[0];
    if (next) {
      onSelect(next.public_id);
    }
  }

  function renderGroup(dimension: Dimension, options: string[]) {
    if (options.length === 0) {
      return null;
    }
    return (
      <div key={dimension} className="flex flex-col gap-2">
        <p className="text-sm font-medium capitalize">{dimension}</p>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = selected?.[dimension] === option;
            const disabled = isOptionDisabled(dimension, option);
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => selectOption(dimension, option)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                  disabled && "cursor-not-allowed line-through opacity-40",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {renderGroup("color", colors)}
      {renderGroup("size", sizes)}
    </div>
  );
}
