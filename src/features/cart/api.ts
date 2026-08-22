import { apiRequest, normalizeApiError } from "@/lib/api/client";
import type { AddCartItemInput, Cart, UpdateCartItemInput } from "@/types/cart";
import type { MessageResponse } from "@/types/auth";

export async function getCart(): Promise<Cart | null> {
  try {
    return await apiRequest<Cart>({ url: "/cart" });
  } catch (error) {
    const err = normalizeApiError(error);
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function addCartItem(input: AddCartItemInput): Promise<Cart> {
  return apiRequest<Cart>({
    url: "/cart/items",
    method: "POST",
    data: input,
  });
}

export async function updateCartItem(
  variantId: string,
  input: UpdateCartItemInput,
): Promise<Cart> {
  return apiRequest<Cart>({
    url: `/cart/items/${variantId}`,
    method: "PATCH",
    data: input,
  });
}

export async function removeCartItem(variantId: string): Promise<void> {
  await apiRequest<void>({
    url: `/cart/items/${variantId}`,
    method: "DELETE",
  });
}

export async function clearCart(): Promise<void> {
  await apiRequest<MessageResponse>({ url: "/cart", method: "DELETE" });
}
