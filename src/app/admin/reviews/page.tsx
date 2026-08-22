"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, MessageSquareText, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PaginationFromReviews } from "@/components/shared/pagination";
import { Rating } from "@/components/shared/rating";
import { qk } from "@/lib/api/queryKeys";
import type {
  AdminReviewListParams,
  AdminReviewRow,
  AdminReviewsPage,
  ReviewApprovedFilter,
} from "@/types/reviews";
import type { ApiError } from "@/types/envelopes";
import {
  deleteAdminReview,
  listAdminReviews,
  moderateAdminReview,
} from "@/features/admin/reviews-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/format";
import { EditReviewDialog } from "@/features/admin/review-components/edit-review-dialog";
import { ReviewDetailDialog } from "@/features/admin/review-components/review-detail-dialog";
import { useUpdateSearchParams } from "@/features/admin/product-components/use-update-search-params";

const REVIEW_SORTS = ["created_at", "rating"] as const;
const APPROVED_FILTERS: readonly ReviewApprovedFilter[] = [
  "all",
  "true",
  "false",
];
const REVIEWS_PREFIX_KEY = qk.admin.reviews()[0];

type ReviewSortField = (typeof REVIEW_SORTS)[number];

function parseSortField(value: string | null): ReviewSortField {
  if (value !== null && (REVIEW_SORTS as readonly string[]).includes(value)) {
    return value as ReviewSortField;
  }
  return "created_at";
}

function parsePage(value: string | null): number {
  const parsed = Number(value ?? "1");
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return 1;
}

function parseRating(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) {
    return parsed;
  }
  return null;
}

function parseApprovedFilter(value: string | null): ReviewApprovedFilter {
  if (
    value !== null &&
    (APPROVED_FILTERS as readonly string[]).includes(value)
  ) {
    return value as ReviewApprovedFilter;
  }
  return "all";
}

function excerpt(review: AdminReviewRow): string {
  const text = review.title ?? review.comment ?? "";
  if (text === "") return "—";
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

function useUrlSyncedInput(key: string) {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();

  const urlValue = searchParams.get(key) ?? "";
  const [input, setInput] = useState(urlValue);
  const debouncedInput = useDebouncedValue(input, 300);

  useEffect(() => {
    if (debouncedInput !== urlValue) {
      updateParams({
        [key]: debouncedInput.trim() === "" ? null : debouncedInput.trim(),
        page: null,
      });
    }
  }, [debouncedInput, urlValue, key, updateParams]);

  return { value: input, onChange: setInput };
}

function ReviewsTable() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateSearchParams();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<AdminReviewRow | null>(null);
  const [viewing, setViewing] = useState<AdminReviewRow | null>(null);
  const [deleting, setDeleting] = useState<AdminReviewRow | null>(null);

  const page = parsePage(searchParams.get("page"));
  const searchTerm = searchParams.get("search") ?? "";
  const ratingFilter = parseRating(searchParams.get("rating"));
  const approvedFilter = parseApprovedFilter(
    searchParams.get("approved") ?? "all",
  );
  const includeDeleted = searchParams.get("deleted") === "1";
  const sortField = parseSortField(searchParams.get("sort"));
  const desc = searchParams.get("dir") !== "asc";

  const search = useUrlSyncedInput("search");

  const params: AdminReviewListParams = {
    page,
    limit: 10,
    ...(searchTerm !== "" ? { search: searchTerm } : {}),
    ...(ratingFilter !== null ? { rating: ratingFilter } : {}),
    is_approved: approvedFilter,
    include_deleted: includeDeleted,
    sort: sortField,
    desc,
  };

  const query = useQuery({
    queryKey: qk.admin.reviews(params),
    queryFn: () => listAdminReviews(params),
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: ({
      reviewId,
      next,
    }: {
      reviewId: string;
      next: boolean;
    }) => moderateAdminReview(reviewId, { is_approved: next }),
    onMutate: async ({ reviewId, next }) => {
      await queryClient.cancelQueries({ queryKey: [REVIEWS_PREFIX_KEY] });
      const snapshots =
        queryClient.getQueriesData<AdminReviewsPage>({
          queryKey: [REVIEWS_PREFIX_KEY],
        });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<AdminReviewsPage>(key, {
          ...data,
          reviews: data.reviews.map((review) =>
            review.public_id === reviewId
              ? { ...review, is_approved: next }
              : review,
          ),
        });
      }
      return { snapshots };
    },
    onError: (error: ApiError, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(error.message || "Could not update moderation status.");
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.next ? "Review approved" : "Review unapproved");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [REVIEWS_PREFIX_KEY],
      });
    },
  });

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteAdminReview(deleting.public_id);
      toast.success("Review deleted");
      await queryClient.invalidateQueries({ queryKey: [REVIEWS_PREFIX_KEY] });
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || "Could not delete the review.");
      throw error;
    }
  }

  function changePage(next: number) {
    updateParams({ page: next > 1 ? String(next) : null });
  }

  const reviews = query.data?.reviews ?? [];
  const hasFilters =
    searchTerm !== "" ||
    ratingFilter !== null ||
    approvedFilter !== "all" ||
    includeDeleted;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="review-search">Search</Label>
          <Input
            id="review-search"
            value={search.value}
            placeholder="Product, title, comment or customer"
            className="w-64"
            autoComplete="off"
            onChange={(e) => search.onChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="review-rating" className="text-sm font-normal">
            Rating
          </Label>
          <Select
            value={ratingFilter !== null ? String(ratingFilter) : "any"}
            onValueChange={(value) =>
              updateParams({
                rating: value === "any" ? null : value,
                page: null,
              })
            }
          >
            <SelectTrigger id="review-rating" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {[1, 2, 3, 4, 5].map((star) => (
                <SelectItem key={star} value={String(star)}>
                  {star} stars
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="review-approved" className="text-sm font-normal">
            Approval
          </Label>
          <Select
            value={approvedFilter}
            onValueChange={(value) =>
              updateParams({ approved: value === "all" ? null : value, page: null })
            }
          >
            <SelectTrigger id="review-approved" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Approved</SelectItem>
              <SelectItem value="false">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="review-sort" className="text-sm font-normal">
            Sort
          </Label>
          <Select
            value={sortField}
            onValueChange={(value) => updateParams({ sort: value, page: null })}
          >
            <SelectTrigger id="review-sort" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={desc ? "desc" : "asc"}
            onValueChange={(value) =>
              updateParams({ dir: value === "desc" ? null : "asc", page: null })
            }
          >
            <SelectTrigger aria-label="Sort direction" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="reviews-deleted"
            checked={includeDeleted}
            onCheckedChange={(checked) =>
              updateParams({ deleted: checked ? "1" : null, page: null })
            }
          />
          <Label htmlFor="reviews-deleted" className="text-sm font-normal">
            Include deleted
          </Label>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={
            hasFilters ? "No reviews match your filters" : "No reviews yet"
          }
          description={
            hasFilters
              ? "Try adjusting the search or moderation filters."
              : "Customer reviews will appear here for moderation."
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Title / Excerpt</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => {
                const dimmed = review.deleted_at != null;
                return (
                  <TableRow
                    key={review.public_id}
                    className={dimmed ? "opacity-50" : undefined}
                  >
                    <TableCell className="max-w-44 truncate font-medium">
                      {review.product_name}
                    </TableCell>
                    <TableCell>
                      <Rating value={review.rating} />
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {excerpt(review)}
                    </TableCell>
                    <TableCell>
                      <p>{review.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {review.customer_email}
                      </p>
                    </TableCell>
                    <TableCell>
                      {dimmed ? (
                        <Badge variant="outline">deleted</Badge>
                      ) : review.is_approved ? (
                        <Badge className="border-green-200 bg-green-100 text-green-800">
                          approved
                        </Badge>
                      ) : (
                        <Badge className="border-yellow-200 bg-yellow-100 text-yellow-800">
                          pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(review.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="View review"
                          onClick={() => setViewing(review)}
                        >
                          <Eye aria-hidden className="size-4" />
                        </Button>
                        {dimmed ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title="Deleted reviews cannot be approved"
                          >
                            <Check aria-hidden className="size-4" />
                            Approve
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={toggleApprovalMutation.isPending}
                            onClick={() =>
                              toggleApprovalMutation.mutate({
                                reviewId: review.public_id,
                                next: !review.is_approved,
                              })
                            }
                          >
                            {review.is_approved ? (
                              <>
                                <X aria-hidden className="size-4" />
                                Unapprove
                              </>
                            ) : (
                              <>
                                <Check aria-hidden className="size-4" />
                                Approve
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Edit review"
                          onClick={() => setEditing(review)}
                        >
                          <Pencil aria-hidden className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Delete review"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(review)}
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {query.data ? (
            <PaginationFromReviews
              pagination={{
                page: query.data.pagination.page,
                has_more: query.data.pagination.has_more,
              }}
              onPageChange={changePage}
            />
          ) : null}
        </>
      )}

      {editing ? (
        <EditReviewDialog
          open
          review={editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      {viewing ? (
        <ReviewDetailDialog
          open
          review={viewing}
          onOpenChange={(open) => {
            if (!open) setViewing(null);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`Delete this review by ${deleting?.customer_name ?? ""}?`}
        description="The review is soft-deleted and disappears from the product page. You can still find it under “Include deleted”."
        confirmLabel="Delete review"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ReviewsPageContent() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Moderate customer reviews before they appear on the storefront.
        </p>
      </div>
      <ReviewsTable />
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ReviewsPageContent />
    </Suspense>
  );
}
