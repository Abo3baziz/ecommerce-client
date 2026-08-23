"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  LayoutDashboard,
  MessageSquareText,
  Package,
  ScrollText,
  ShoppingCart,
  Store,
  Ticket,
  TrendingUp,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/components/layout/account-menu";
import { useSession } from "@/features/auth/session-context";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/users", label: "Customers", icon: Users },
];

// Super-admin-only sections; hidden for regular admins via the session probe.
const SUPER_ADMIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

const ANALYTICS_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/admin/analytics", label: "Overview", icon: TrendingUp, exact: true },
  { href: "/admin/analytics/coupons", label: "Coupon insights", icon: Ticket },
  { href: "/admin/analytics/expenses", label: "Expenses", icon: Warehouse },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isSuperAdmin } = useSession();
  const items = isSuperAdmin ? [...NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Store className="size-5" aria-hidden />
        <span className="font-semibold">Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3" aria-label="Admin">
        {items.map(({ href, label, icon: Icon, exact }) => {
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
        {isSuperAdmin ? (
          <div className="mt-3 border-t pt-2">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Analytics
            </p>
            {ANALYTICS_NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
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
          </div>
        ) : null}
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
  const { isSuperAdmin } = useSession();
  const items = isSuperAdmin
    ? [...NAV_ITEMS, ...SUPER_ADMIN_NAV_ITEMS, ...ANALYTICS_NAV_ITEMS]
    : NAV_ITEMS;
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b bg-background px-3 py-2 md:hidden"
      aria-label="Admin sections"
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
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
