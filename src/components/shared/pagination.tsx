"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { TooltipIconButton } from "@/components/shared/tooltip-icon-button";

export interface PaginationProps {
  page: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

export function pageWindow(page: number, totalPages: number): number[] {
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

export function resolveBounds(
  page: number,
  opts: {
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    hasMore?: boolean;
  },
): { canPrev: boolean; canNext: boolean } {
  const canPrev = opts.hasPrev ?? page > 1;
  const canNext =
    opts.hasNext ??
    opts.hasMore ??
    (opts.totalPages !== undefined ? page < opts.totalPages : false);
  return { canPrev, canNext };
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
  const { canPrev, canNext } = resolveBounds(page, {
    totalPages,
    hasNext,
    hasPrev,
    hasMore,
  });

  const numbered =
    totalPages !== undefined && Number.isFinite(totalPages) && totalPages > 0;

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 ${className ?? ""}`}
    >
      <TooltipIconButton
        variant="outline"
        size="icon"
        label="Previous page"
        side="top"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </TooltipIconButton>

      {numbered
        ? pageWindow(page, totalPages).map((p) => (
            <TooltipIconButton
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              label={`Page ${p}`}
              side="top"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </TooltipIconButton>
          ))
        : null}

      {!numbered ? (
        <span className="px-3 text-sm text-muted-foreground">
          Page {page}
          {totalPages !== undefined ? ` of ${totalPages}` : ""}
        </span>
      ) : null}

      <TooltipIconButton
        variant="outline"
        size="icon"
        label="Next page"
        side="top"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </TooltipIconButton>
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
  props: Omit<PaginationProps, "page" | "hasMore"> & {
    pagination: ReviewsPaginationData;
  },
) {
  const { pagination, ...rest } = props;
  return (
    <Pagination {...rest} page={pagination.page} hasMore={pagination.has_more} />
  );
}
