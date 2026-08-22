"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  LayoutDashboard,
  MessageSquareText,
  Package,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/layout/account-menu";

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/users", label: "Customers", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Store className="size-5" aria-hidden />
        <span className="font-semibold">Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3" aria-label="Admin">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Store className="size-4" aria-hidden />
          Back to store
        </Link>
        <div className="mt-1 px-1">
          <AccountMenu />
        </div>
      </div>
    </div>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b bg-background px-3 py-2 md:hidden"
      aria-label="Admin sections"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
