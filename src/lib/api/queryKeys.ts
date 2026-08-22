import type {
  AdminAuditListParams,
  AdminCategoryListParams,
  AdminOrderListParams,
  AdminProductListParams,
  AdminReviewListParams,
  AdminUserListParams,
  AdminVariantListParams,
  CategoryListParams,
  CustomerOrderListParams,
  InventoryListParams,
  MyReviewListParams,
  ProductListParams,
  ProductReviewListParams,
  StatsPeriodPreset,
} from "@/types";

export const qk = {
  session: ["session"] as const,
  me: ["me"] as const,
  csrf: ["csrf-token"] as const,
  addresses: (params?: { page?: number; limit?: number }) =>
    ["addresses", params ?? {}] as const,
  sessions: ["auth-sessions"] as const,

  products: (params: ProductListParams = {}) => ["products", params] as const,
  product: (productId: string) => ["product", productId] as const,
  categories: (params: CategoryListParams = {}) =>
    ["categories", params] as const,
  category: (categoryId: string) => ["category", categoryId] as const,
  categoryProducts: (categoryId: string, params: ProductListParams = {}) =>
    ["category-products", categoryId, params] as const,

  cart: ["cart"] as const,

  orders: (params: CustomerOrderListParams = {}) => ["orders", params] as const,
  order: (orderId: string) => ["order", orderId] as const,

  productReviews: (
    productId: string,
    params: ProductReviewListParams = {},
  ) => ["product-reviews", productId, params] as const,
  review: (reviewId: string) => ["review", reviewId] as const,
  myReviews: (params: MyReviewListParams = {}) =>
    ["my-reviews", params] as const,

  admin: {
    products: (params: AdminProductListParams = {}) =>
      ["admin-products", params] as const,
    product: (productId: string) => ["admin-product", productId] as const,
    variants: (productId: string, params: AdminVariantListParams = {}) =>
      ["admin-variants", productId, params] as const,
    variant: (productId: string, variantId: string) =>
      ["admin-variant", productId, variantId] as const,
    productImages: (productId: string) =>
      ["admin-product-images", productId] as const,
    variantImages: (productId: string, variantId: string) =>
      ["admin-variant-images", productId, variantId] as const,
    imagekitAuth: ["admin-imagekit-auth"] as const,

    categories: (params: AdminCategoryListParams = {}) =>
      ["admin-categories", params] as const,
    category: (categoryId: string) =>
      ["admin-category", categoryId] as const,
    categoryProducts: (
      categoryId: string,
      params: { page?: number; limit?: number } = {},
    ) => ["admin-category-products", categoryId, params] as const,

    inventory: (params: InventoryListParams = {}) =>
      ["admin-inventory", params] as const,
    inventoryRecord: (variantId: string) =>
      ["admin-inventory-record", variantId] as const,

    orders: (params: AdminOrderListParams = {}) =>
      ["admin-orders", params] as const,
    order: (orderId: string) => ["admin-order", orderId] as const,

    reviews: (params: AdminReviewListParams = {}) =>
      ["admin-reviews", params] as const,
    review: (reviewId: string) => ["admin-review", reviewId] as const,

    users: (params: AdminUserListParams = {}) =>
      ["admin-users", params] as const,
    user: (userId: string) => ["admin-user", userId] as const,

    stats: (preset: StatsPeriodPreset) =>
      ["admin-stats", preset] as const,
    audit: (params: AdminAuditListParams = {}) =>
      ["admin-audit", params] as const,
  },
};
