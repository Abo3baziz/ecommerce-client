"use client";

import Link from "next/link";
import { useCategories } from "@/features/catalog/hooks";

export function StorefrontFooter() {
  const categories = useCategories();

  return (
    <footer className="border-t bg-secondary/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-heading text-xl font-semibold uppercase">
              Storefront
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              A full-stack commerce build — storefront and admin console on a
              custom API.
            </p>
            <p className="label-caps mt-4">Est. catalog in production</p>
          </div>
          <div>
            <p className="label-caps border-b pb-2">Shop</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/products"
                  className="transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
                >
                  All products
                </Link>
              </li>
              {(categories.data ?? []).slice(0, 6).map((category) => (
                <li key={category.public_id}>
                  <Link
                    href={`/categories/${category.public_id}`}
                    className="transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label-caps border-b pb-2">Account</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/account"
                  className="transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
                >
                  Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
                >
                  Order history
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="transition-colors hover:text-foreground hover:underline hover:underline-offset-4"
                >
                  Cart
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex items-end justify-between gap-6 border-t pt-4">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-muted-foreground">
              © {new Date().getFullYear()} Ahmed Abdelaziz ·{" "}
              <a
                href="https://codebyahmed.online"
                target="_blank"
                rel="noreferrer"
                className="text-blue underline-offset-4 hover:underline"
              >
                codebyahmed.online
              </a>
            </p>
          </div>
          <div aria-hidden className="h-8 w-40 shrink-0 text-foreground/70">
            <div className="barcode-strip" />
            <p className="label-caps mt-1 text-right text-[0.5625rem]">
              SF-{new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
