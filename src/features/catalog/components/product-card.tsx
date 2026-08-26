"use client";

import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  return (
    <Link
      href={`/products/${product.public_id}`}
      className={cn(
        "group flex flex-col overflow-hidden border bg-card transition-all duration-200 [transition-timing-function:var(--ease-ballistic)] hover:border-foreground hover:shadow-[0_6px_16px_-8px_oklch(0_0_0/0.35)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <div className="aspect-square overflow-hidden border-b bg-muted">
        {product.primary_image ? (
          <img
            src={product.primary_image.image_url}
            alt={product.primary_image.alt_text ?? product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 [transition-timing-function:var(--ease-ballistic)] group-hover:scale-[1.04]"
          />
        ) : (
          <div
            role="img"
            aria-label={`${product.name} — no photo available`}
            className="hatch-light flex size-full items-center justify-center text-muted-foreground"
          >
            <ImageIcon
              aria-hidden
              className="size-10 text-muted-foreground/50 transition-transform duration-200 group-hover:scale-110"
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm leading-snug font-medium">
          {product.name}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground uppercase tracking-wide">
          {product.brand ?? "Unbranded"}
        </p>
      </div>
      <p className="border-t px-3 py-1.5 font-mono text-[0.6875rem] text-muted-foreground/80 tabular-nums truncate">
        {product.public_id}
      </p>
    </Link>
  );
}
