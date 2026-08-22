"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ApiError } from "@/types/envelopes";
import {
  Pagination,
  PaginationFromReviews,
  PaginationFromStandard,
} from "@/components/shared/pagination";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { Rating, RatingInput } from "@/components/shared/rating";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SAMPLE_ERROR: ApiError = {
  status: 500,
  code: "INTERNAL",
  message: "Something blew up on the server.",
};

export default function UiDemoPage() {
  const [pageA, setPageA] = useState(2);
  const [pageB, setPageB] = useState(1);
  const [rating, setRating] = useState<number | null>(4);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Shared UI kit demo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Internal reference page — not linked from production navigation.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pagination</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Standard shape (numbered window) — page {pageA}
            </p>
            <PaginationFromStandard
              pagination={{ page: pageA, totalPages: 12, hasNext: true, hasPrev: true }}
              onPageChange={setPageA}
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Reviews shape (has_more) — page {pageB}
            </p>
            <PaginationFromReviews
              pagination={{ page: pageB, has_more: true }}
              onPageChange={setPageB}
            />
          </div>
          <Pagination page={1} totalPages={1} onPageChange={() => undefined} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money &amp; badges</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4 text-lg">
            <Money value="1299.99" />
            <Money value="0.5" />
            <Money value={null} />
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value="pending" />
            <StatusBadge value="shipped" />
            <StatusBadge value="delivered" />
            <StatusBadge value="LOW_STOCK" />
            <StatusBadge value="OUT_OF_STOCK" />
            <StatusBadge value="SUPER_ADMIN" />
            <StatusBadge value="SUSPENDED" />
            <StatusBadge value="TOTALLY_UNKNOWN" />
            <StatusBadge value={null} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rating</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Rating value={3.5} />
          <Rating value={null} />
          <div className="flex items-center gap-3">
            <RatingInput value={rating} onChange={setRating} />
            <span className="text-sm text-muted-foreground">
              selected: {rating ?? "none"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>States</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <EmptyState
            title="No orders yet"
            description="Orders you place will show up here."
            action={
              <Button size="sm" variant="outline">
                Start shopping
              </Button>
            }
          />
          <ErrorState error={SAMPLE_ERROR} onRetry={() => toast.success("Retried!")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dialogs &amp; toasts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Open confirm dialog
          </Button>
          <Button variant="outline" onClick={() => toast.success("Saved!")}>
            Success toast
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error(SAMPLE_ERROR.message)}
          >
            Error toast
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete address?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await new Promise((resolve) => setTimeout(resolve, 800));
          toast.success("Address deleted");
        }}
      />
    </main>
  );
}
