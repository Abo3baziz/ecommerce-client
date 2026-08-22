import type { IsoDateTime, ListPagination, PublicId } from "./envelopes";
import type { ProductId } from "./catalog";
import type { UserId } from "./auth";

export type ReviewId = PublicId<"rev_">;
export type ReviewImageId = PublicId<"rvimg_">;

export interface ReviewImage {
  public_id: ReviewImageId;
  image_url: string;
  alt_text: string | null;
  display_order: number | null;
}

export interface ReviewBase {
  public_id: ReviewId;
  rating: number;
  title: string | null;
  comment: string | null;
  customer_name: string;
  product_public_id: ProductId;
  product_name: string;
  product_slug: string;
  images: ReviewImage[];
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface RatingSummary {
  average_rating: number | null;
  total_count: number;
}

export interface ProductReviewsPage {
  summary: RatingSummary;
  reviews: ReviewBase[];
  pagination: ListPagination;
}

export interface MyReview extends ReviewBase {
  is_approved: boolean;
}

export interface MyReviewsPage {
  reviews: MyReview[];
  pagination: ListPagination;
}

export interface AdminReviewRow extends ReviewBase {
  is_approved: boolean;
  customer_email: string;
  deleted_at?: IsoDateTime | null;
}

export interface AdminReviewDetail extends AdminReviewRow {
  customer_public_id: UserId;
}

export interface AdminReviewsPage {
  reviews: AdminReviewRow[];
  pagination: ListPagination;
}

export interface ReviewImageInput {
  image_url: string;
  alt_text?: string;
}

export interface CreateReviewInput {
  product_public_id: ProductId;
  rating: number;
  title?: string;
  comment?: string;
  images?: ReviewImageInput[];
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string | null;
  comment?: string | null;
  images?: ReviewImageInput[];
}

export interface UpdateReviewModerationInput {
  is_approved?: boolean;
  rating?: number;
  title?: string | null;
  comment?: string | null;
}

export interface ProductReviewListParams {
  page?: number;
  limit?: number;
  rating?: number;
  sort?: "created_at" | "rating";
  desc?: boolean;
}

export interface MyReviewListParams {
  page?: number;
  limit?: number;
  sort?: "created_at" | "rating";
  desc?: boolean;
}

export type ReviewApprovedFilter = "true" | "false" | "all";

export interface AdminReviewListParams extends MyReviewListParams {
  search?: string;
  rating?: number;
  is_approved?: ReviewApprovedFilter;
  include_deleted?: boolean;
}
