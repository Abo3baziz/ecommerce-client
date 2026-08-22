"use client";

import { useRef } from "react";
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
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusStar(star: number): void {
    const clamped = Math.min(5, Math.max(1, star));
    starRefs.current[clamped - 1]?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    star: number,
  ): void {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = Math.min(5, star + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = Math.max(1, star - 1);
    } else if (event.key === "Home") {
      next = 1;
    } else if (event.key === "End") {
      next = 5;
    }
    if (next !== null) {
      event.preventDefault();
      onChange(next);
      focusStar(next);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          ref={(el) => {
            starRefs.current[star - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          onKeyDown={(event) => handleKeyDown(event, star)}
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
