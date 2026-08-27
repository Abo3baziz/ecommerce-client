"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  productName: string;
  defaultSelectedId?: string;
}

export function ProductGallery({
  images,
  productName,
  defaultSelectedId,
}: ProductGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => defaultSelectedId ?? images[0]?.id ?? null,
  );

  const selected =
    images.find((image) => image.id === selectedId) ?? images[0] ?? null;

  if (!selected) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted">
        <ImageIcon aria-hidden className="size-12 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border bg-muted">
        <img
          src={selected.url}
          alt={selected.alt ?? productName}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={800}
          height={800}
          className="aspect-square w-full object-cover"
        />
      </div>
      {images.length > 1 ? (
        <div
          className="flex flex-wrap gap-2"
          role="listbox"
          aria-label="Product photos"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="option"
              aria-selected={image.id === selected.id}
              aria-label={`View photo ${index + 1}`}
              onClick={() => setSelectedId(image.id)}
              className={cn(
                "size-16 overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                image.id === selected.id
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground/30",
              )}
            >
              <img
                src={image.url}
                alt={image.alt ?? `${productName} — photo ${index + 1}`}
                loading="lazy"
                decoding="async"
                width={64}
                height={64}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
