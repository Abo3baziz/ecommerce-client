export type Money = string;
export type IsoDateTime = string;
export type PublicId<Prefix extends string> = `${Prefix}${string}`;

export interface Envelope<T> {
  success: true;
  data: T;
}

export interface PaginationStandard {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationReviews {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface ListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  has_more: boolean;
}

export type Paginated<T> = Envelope<T[]> & {
  pagination: PaginationStandard;
};

export interface ApiErrorPayloadA {
  error: {
    code: string;
    message: string;
  };
}

export interface ApiErrorPayloadB {
  success: false;
  message: string;
}

export interface ApiError {
  status: number;
  code?: string;
  message: string;
  errors?: Record<string, unknown>;
}

export function isEnvelope(value: unknown): value is Envelope<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success: unknown }).success === true &&
    "data" in value
  );
}

export function hasPagination(
  value: unknown,
): value is { pagination: PaginationStandard } {
  return (
    typeof value === "object" &&
    value !== null &&
    "pagination" in value &&
    typeof (value as { pagination: unknown }).pagination === "object"
  );
}
