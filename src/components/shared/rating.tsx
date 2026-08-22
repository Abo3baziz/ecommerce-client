"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const rounded = value ? Math.round(value) : 0;
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={value ? `Rated ${value} out of 5` : "Not rated"}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            "size-4",
            star <= rounded
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

interface RatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RatingInput({ value, onChange, disabled }: RatingInputProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            aria-hidden
            className={cn(
              "size-6 transition-colors",
              value !== null && star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40 hover:text-amber-400",
            )}
          />
        </button>
      ))}
    </div>
  );
}
