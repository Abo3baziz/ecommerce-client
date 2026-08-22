"use client";

import Link from "next/link";
import { useCategories } from "@/features/catalog/hooks";

export function StorefrontFooter() {
  const categories = useCategories();

  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold">Storefront</p>
          <p className="mt-2 text-sm text-muted-foreground">
            A demo storefront powered by the ecommerce API.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Shop</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/products" className="hover:text-foreground">
                All products
              </Link>
            </li>
            {(categories.data ?? []).slice(0, 6).map((category) => (
              <li key={category.public_id}>
                <Link
                  href={`/categories/${category.public_id}`}
                  className="hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Account</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/account" className="hover:text-foreground">
                Profile
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-foreground">
                Order history
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-foreground">
                Cart
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
