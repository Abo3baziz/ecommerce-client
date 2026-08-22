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
        "group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <div className="flex aspect-square items-center justify-center bg-muted">
        <ImageIcon
          aria-hidden
          className="size-10 text-muted-foreground/40 transition-transform group-hover:scale-110"
        />
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {product.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {product.brand ?? "Unbranded"}
        </p>
      </div>
    </Link>
  );
}
