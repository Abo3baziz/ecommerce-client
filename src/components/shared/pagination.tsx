"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationProps {
  page: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageWindow(page: number, totalPages: number): number[] {
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }
  return pages;
}

export function Pagination({
  page,
  totalPages,
  hasNext,
  hasPrev,
  hasMore,
  onPageChange,
  className,
}: PaginationProps) {
  const canPrev = hasPrev ?? page > 1;
  const canNext =
    hasNext ?? hasMore ?? (totalPages !== undefined ? page < totalPages : false);

  const numbered =
    totalPages !== undefined && Number.isFinite(totalPages) && totalPages > 0;

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 ${className ?? ""}`}
    >
      <Button
        variant="outline"
        size="icon"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {numbered
        ? pageWindow(page, totalPages).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ))
        : null}

      {!numbered ? (
        <span className="px-3 text-sm text-muted-foreground">
          Page {page}
          {totalPages !== undefined ? ` of ${totalPages}` : ""}
        </span>
      ) : null}

      <Button
        variant="outline"
        size="icon"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}

export interface StandardPaginationData {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReviewsPaginationData {
  page: number;
  has_more: boolean;
}

export function PaginationFromStandard(
  props: Omit<PaginationProps, keyof StandardPaginationData> & {
    pagination: StandardPaginationData;
  },
) {
  const { pagination, ...rest } = props;
  return (
    <Pagination
      {...rest}
      page={pagination.page}
      totalPages={pagination.totalPages}
      hasNext={pagination.hasNext}
      hasPrev={pagination.hasPrev}
    />
  );
}

export function PaginationFromReviews(
  props: Omit<PaginationProps, "hasMore"> & { pagination: ReviewsPaginationData },
) {
  const { pagination, ...rest } = props;
  return (
    <Pagination {...rest} page={pagination.page} hasMore={pagination.has_more} />
  );
}
