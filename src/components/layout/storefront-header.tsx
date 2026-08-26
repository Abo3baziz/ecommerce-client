"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/shared/tooltip-icon-button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountMenu } from "@/components/layout/account-menu";
import { useSession } from "@/features/auth/session-context";
import { useCategories } from "@/features/catalog/hooks";
import { useCart } from "@/features/cart/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function StorefrontHeader() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const debounced = useDebouncedValue(inputValue, 300);
  const lastPushed = useRef<string | null>(null);
  const categories = useCategories();
  const { user } = useSession();

  useEffect(() => {
    const query = debounced.trim();
    if (!query || lastPushed.current === query) {
      return;
    }
    lastPushed.current = query;
    router.push(`/products?search=${encodeURIComponent(query)}`);
  }, [debounced, router]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = inputValue.trim();
    if (!query) {
      return;
    }
    lastPushed.current = query;
    router.push(`/products?search=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto hidden w-full max-w-7xl items-center justify-between px-4 py-1 sm:flex">
        <p className="label-caps">General catalog</p>
        <p className="label-caps">Browse · Cart · Checkout</p>
      </div>
      <div className="rule-double" />
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            aria-hidden
            className="flex size-8 items-center justify-center border bg-primary text-primary-foreground"
          >
            <span className="font-heading text-lg leading-none font-bold">
              S
            </span>
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-heading text-xl font-semibold tracking-tight uppercase">
              Storefront
            </span>
            <span className="label-caps mt-0.5 text-[0.625rem]">
              General supply
            </span>
          </span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0 font-mono text-xs uppercase tracking-[0.12em]">
              Index
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-80 w-56 overflow-auto rounded-none"
          >
            {categories.isLoading ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (categories.data ?? []).length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No categories yet
              </div>
            ) : (
              (categories.data ?? []).map((category) => (
                <DropdownMenuItem key={category.public_id} asChild>
                  <Link href={`/categories/${category.public_id}`}>
                    {category.name}
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <form
          role="search"
          className="flex min-w-0 flex-1 items-center"
          onSubmit={submitSearch}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="rounded-none pl-8 font-mono text-sm"
            />
          </div>
        </form>

        <TooltipIconButton
          asChild
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          label="View cart"
        >
          <Link href="/cart">
            <ShoppingCart className="size-4" aria-hidden />
            {user ? <CartBadge /> : null}
          </Link>
        </TooltipIconButton>

        <AccountMenu />
      </div>
    </header>
  );
}

function CartBadge() {
  const { data: cart } = useCart();
  if (!cart || cart.items_count === 0) {
    return null;
  }
  return (
    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center bg-safety px-0.5 font-mono text-[10px] leading-4 font-semibold text-primary-foreground">
      {cart.items_count > 99 ? "99+" : cart.items_count}
    </span>
  );
}
