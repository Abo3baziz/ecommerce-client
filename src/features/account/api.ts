import { apiRequest } from "@/lib/api/client";
import type {
  Address,
  AddressId,
  AddressInput,
  AddressUpdateInput,
  ChangeEmailInput,
  ChangePasswordInput,
  ChangePhoneInput,
  DeleteAccountInput,
  MessageResponse,
  MyReview,
  MyReviewListParams,
  MyReviewsPage,
  PhoneChangeVerifyResponse,
  ReviewId,
  UpdateProfileInput,
  UpdateReviewInput,
  UserProfile,
  VerifyOtpInput,
} from "@/types";

export interface AddressListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  has_more?: boolean;
}

export interface AddressListPage {
  data: Address[];
  pagination: AddressListPagination;
}

export async function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>({ url: "/users/me" });
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UserProfile> {
  return apiRequest<UserProfile>({
    url: "/users/me",
    method: "PATCH",
    data: input,
  });
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<void> {
  await apiRequest<void>({
    url: "/users/me/password",
    method: "PATCH",
    data: input,
  });
}

export async function requestEmailChange(
  input: ChangeEmailInput,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>({
    url: "/users/me/email",
    method: "POST",
    data: input,
  });
}

export async function requestPhoneChange(
  input: ChangePhoneInput,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>({
    url: "/users/me/phone-number",
    method: "POST",
    data: input,
  });
}

export async function verifyPhoneChange(
  input: VerifyOtpInput,
): Promise<PhoneChangeVerifyResponse> {
  return apiRequest<PhoneChangeVerifyResponse>({
    url: "/users/me/phone-number/verify",
    method: "POST",
    data: input,
  });
}

export async function deleteAccount(input: DeleteAccountInput): Promise<void> {
  await apiRequest<void>({ url: "/users/me", method: "DELETE", data: input });
}

export async function listAddresses(
  params: { page?: number; limit?: number } = {},
): Promise<AddressListPage> {
  return apiRequest<AddressListPage>({
    url: "/users/me/addresses",
    params: { page: params.page ?? 1, limit: params.limit ?? 50 },
  });
}

export async function createAddress(input: AddressInput): Promise<Address> {
  return apiRequest<Address>({
    url: "/users/me/addresses",
    method: "POST",
    data: input,
  });
}

export async function updateAddress(
  addressId: AddressId,
  input: AddressUpdateInput,
): Promise<Address> {
  return apiRequest<Address>({
    url: `/users/me/addresses/${addressId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteAddress(addressId: AddressId): Promise<void> {
  await apiRequest<void>({
    url: `/users/me/addresses/${addressId}`,
    method: "DELETE",
  });
}

export async function listMyReviews(
  params: MyReviewListParams = {},
): Promise<MyReviewsPage> {
  return apiRequest<MyReviewsPage>({
    url: "/users/me/reviews",
    params: { page: params.page ?? 1, limit: params.limit ?? 10 },
  });
}

export async function updateReview(
  reviewId: ReviewId,
  input: UpdateReviewInput,
): Promise<MyReview> {
  return apiRequest<MyReview>({
    url: `/reviews/${reviewId}`,
    method: "PATCH",
    data: input,
  });
}

export async function deleteReview(reviewId: ReviewId): Promise<void> {
  await apiRequest<void>({
    url: `/reviews/${reviewId}`,
    method: "DELETE",
  });
}
