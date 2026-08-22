"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight,
  Minus,
  PackageSearch,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Money } from "@/components/shared/money";
import { addCartItem } from "@/features/cart/api";
import { useSession } from "@/features/auth/session-context";
import { normalizeApiError } from "@/lib/api/client";
import { qk } from "@/lib/api/queryKeys";
import type { CustomerVariant, Money as MoneyString, ProductDetail } from "@/types";
import { useProduct } from "../hooks";
import { ProductGallery } from "./product-gallery";
import type { GalleryImage } from "./product-gallery";
import { VariantPicker } from "./variant-picker";
import { ProductReviewsSection } from "@/features/reviews/components/product-reviews-section";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 999;

function hasPositiveDiscount(value: MoneyString | null): boolean {
  if (!value) return false;
  return Number(value) > 0;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, value));
}

export function ProductDetailView() {
  const params = useParams<{ productId: string | string[] }>();
  const rawId = params.productId;
  const productId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? (rawId[0] ?? "") : "";

  const productQuery = useProduct(productId);

  if (!productId || productQuery.isPending) {
    return <ProductDetailSkeleton />;
  }

  if (productQuery.isError) {
    const status = normalizeApiError(productQuery.error).status;
    if (status === 404 || status === 400) {
      return (
        <EmptyState
          icon={PackageSearch}
          title="This product isn't available"
          description="It may have been removed or is no longer for sale."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/products">Browse products</Link>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        error={productQuery.error}
        onRetry={() => void productQuery.refetch()}
      />
    );
  }

  const product = productQuery.data;

  return (
    <div className="flex flex-col gap-10">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight aria-hidden className="size-3" />
        <span className="max-w-[220px] truncate text-foreground">
          {product.name}
        </span>
      </nav>

      <ProductBody key={product.public_id} product={product} />

      <ProductReviewsSection productId={product.public_id} />
    </div>
  );
}

interface ProductBodyProps {
  product: ProductDetail;
}

function ProductBody({ product }: ProductBodyProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () => product.variants[0]?.public_id ?? null,
  );

  const selectedVariant: CustomerVariant | null =
    product.variants.find((v) => v.public_id === selectedVariantId) ??
    product.variants[0] ??
    null;

  const variantHasOwnImages =
    selectedVariant !== null && selectedVariant.images.length > 0;

  const galleryImages: GalleryImage[] =
    selectedVariant && variantHasOwnImages
      ? [...selectedVariant.images]
          .sort((a, b) => a.display_order - b.display_order)
          .map((image) => ({
            id: image.public_id,
            url: image.image_url,
            alt: image.alt_text,
          }))
      : [...product.images]
          .sort((a, b) => a.display_order - b.display_order)
          .map((image) => ({
            id: image.public_id,
            url: image.image_url,
            alt: image.alt_text,
          }));

  const primaryImageId =
    product.images.find((image) => image.is_primary)?.public_id ?? undefined;
  const galleryDefaultId = variantHasOwnImages
    ? undefined
    : primaryImageId;

  const [qtyText, setQtyText] = useState("1");
  const quantity = clampQuantity(Number.parseInt(qtyText, 10) || 1);

  const addToCart = useMutation({
    mutationFn: addCartItem,
    onSuccess: (cart, variables) => {
      queryClient.setQueryData(qk.cart, cart);
      const variant = product.variants.find(
        (v) => v.public_id === variables.variant_public_id,
      );
      const optionLabel = [variant?.color, variant?.size]
        .filter((part): part is string => Boolean(part))
        .join(" · ");
      toast.success(`Added ${variables.quantity} × ${product.name}`, {
        description: (
          <>
            {optionLabel ? <span className="block">{optionLabel}</span> : null}
            <span>
              Subtotal: <Money value={cart.subtotal} />
            </span>
          </>
        ),
        action: {
          label: "View cart",
          onClick: () => router.push("/cart"),
        },
      });
    },
    onError: (error: unknown) => {
      const err = normalizeApiError(error);
      if (err.status === 400) {
        toast.error(err.message || "This item can't be added to the cart.");
      } else if (err.status === 409) {
        toast.error(err.message || "Not enough stock available.");
      } else if (err.status === 401) {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
      } else {
        toast.error(err.message || "Could not update your cart. Try again.");
      }
    },
  });

  function handleAddToCart() {
    if (!selectedVariant) {
      return;
    }
    if (!user) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    addToCart.mutate({
      variant_public_id: selectedVariant.public_id,
      quantity,
    });
  }

  function handleQtyTextChange(value: string) {
    setQtyText(value.replace(/\D/g, "").slice(0, 3));
  }

  const discounted = hasPositiveDiscount(selectedVariant?.discount_percentage ?? null);

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
      <div className="lg:w-[45%]">
        <ProductGallery
          key={
            selectedVariant && variantHasOwnImages
              ? `variant-${selectedVariant.public_id}`
              : "product"
          }
          images={galleryImages}
          productName={product.name}
          defaultSelectedId={galleryDefaultId}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          {product.brand ? (
            <p className="text-sm text-muted-foreground">{product.brand}</p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {product.name}
          </h1>
        </div>

        {selectedVariant ? (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <Money
                value={selectedVariant.final_price}
                className="text-3xl font-bold tracking-tight"
              />
              {discounted ? (
                <Money
                  value={selectedVariant.price}
                  className="text-lg text-muted-foreground line-through"
                />
              ) : null}
              {discounted && selectedVariant.discount_percentage !== null ? (
                <Badge variant="secondary">
                  Save {selectedVariant.discount_percentage}%
                </Badge>
              ) : null}
            </div>
            {discounted ? (
              <p className="text-xs font-medium text-green-700">
                Final price applies at checkout
              </p>
            ) : null}
            {selectedVariant.weight ? (
              <p className="text-sm text-muted-foreground">
                Weight: {selectedVariant.weight} kg
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              SKU: {selectedVariant.sku}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This product has no purchasable options right now.
          </p>
        )}

        <VariantPicker
          variants={product.variants}
          selected={selectedVariant}
          onSelect={(variantPublicId) => setSelectedVariantId(variantPublicId)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Decrease quantity"
              disabled={!selectedVariant || quantity <= MIN_QUANTITY}
              onClick={() => setQtyText(String(clampQuantity(quantity - 1)))}
            >
              <Minus aria-hidden className="size-4" />
            </Button>
            <Input
              aria-label="Quantity"
              inputMode="numeric"
              value={qtyText}
              onChange={(event) => handleQtyTextChange(event.target.value)}
              onBlur={() => setQtyText(String(quantity))}
              disabled={!selectedVariant}
              className="w-14 border-0 bg-transparent text-center [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Increase quantity"
              disabled={!selectedVariant || quantity >= MAX_QUANTITY}
              onClick={() => setQtyText(String(clampQuantity(quantity + 1)))}
            >
              <Plus aria-hidden className="size-4" />
            </Button>
          </div>
          <Button
            size="lg"
            className="flex-1 sm:flex-none sm:px-8"
            disabled={!selectedVariant || addToCart.isPending}
            onClick={handleAddToCart}
          >
            <ShoppingCart aria-hidden className="size-4" />
            {addToCart.isPending ? "Adding…" : "Add to cart"}
          </Button>
        </div>
        {!user ? (
          <p className="text-xs text-muted-foreground">
            Sign-in is required before adding items to the cart.
          </p>
        ) : null}

        {product.description ? (
          <div className="flex flex-col gap-2 border-t pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {product.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-10">
      <Skeleton className="h-4 w-64" />
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-lg lg:w-[45%]" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-9 w-36" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
