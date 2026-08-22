import { apiRequest } from "@/lib/api/client";
import type { Address, AddressInput } from "@/types/users";

export interface CheckoutAddressListPage {
  data: Address[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export async function listCheckoutAddresses(): Promise<CheckoutAddressListPage> {
  return apiRequest<CheckoutAddressListPage>({
    url: "/users/me/addresses",
    params: { page: 1, limit: 100 },
  });
}

export async function createCheckoutAddress(
  input: AddressInput,
): Promise<Address> {
  return apiRequest<Address>({
    url: "/users/me/addresses",
    method: "POST",
    data: input,
  });
}
