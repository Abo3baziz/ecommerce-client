"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FolderTree,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Package,
  ScrollText,
  ShieldCheck,
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

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

const ADMIN_MGMT_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
];

const ANALYTICS_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/admin/analytics", label: "Overview", icon: TrendingUp, exact: true },
  { href: "/admin/analytics/coupons", label: "Coupon insights", icon: Ticket },
  { href: "/admin/analytics/expenses", label: "Expenses", icon: Warehouse },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const isActive = useIsActive();
  const { isSuperAdmin } = useSession();

  function renderLinks(list: ReadonlyArray<NavItem>) {
    return list.map(({ href, label, icon: Icon, exact }) => {
      const active = isActive(href, exact);
      return (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-none px-3 py-2 text-sm transition-colors [transition-timing-function:var(--ease-ballistic)]",
            active
              ? "bg-primary font-medium text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </Link>
      );
    });
  }

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Admin">
      {renderLinks(NAV_ITEMS)}
      {isSuperAdmin ? (
        <>
          <div className="mt-3 border-t pt-2">
            <p className="label-caps px-3 pb-1">Analytics</p>
            {renderLinks(ANALYTICS_NAV_ITEMS)}
          </div>
          <div className="mt-3 border-t pt-2">
            <p className="label-caps px-3 pb-1">Admin management</p>
            {renderLinks(ADMIN_MGMT_NAV_ITEMS)}
            <div className="mt-3 border-t pt-2">
              <p className="label-caps px-3 pb-1">Governance</p>
              {renderLinks(SUPER_ADMIN_NAV_ITEMS)}
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b px-4">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center border bg-primary text-primary-foreground"
        >
          <span className="font-heading text-lg leading-none font-bold">A</span>
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-heading text-xl font-semibold uppercase tracking-tight">
            Admin
          </span>
          <span className="label-caps mt-0.5 text-[0.625rem]">
            Operations console
          </span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <div className="border-t p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-none px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background px-3 py-2 md:hidden"
      aria-label="Admin sections"
    >
      <Drawer direction="left" open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-none"
            aria-label="Open admin sections menu"
          >
            <Menu className="size-4" aria-hidden />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="rounded-none border-r">
          <DrawerHeader className="border-b px-4 py-3">
            <DrawerTitle className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center border bg-primary text-primary-foreground"
              >
                <span className="font-heading text-lg leading-none font-bold">
                  A
                </span>
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-heading text-xl font-semibold uppercase tracking-tight">
                  Admin
                </span>
                <span className="label-caps mt-0.5 text-[0.625rem]">
                  Operations console
                </span>
              </span>
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t p-3">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-none px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Store className="size-4" aria-hidden />
              Back to store
            </Link>
          </div>
        </DrawerContent>
      </Drawer>

      <span className="flex flex-1 items-center gap-2 leading-none">
        <span className="font-heading text-lg font-semibold uppercase tracking-tight">
          Admin
        </span>
        <span className="label-caps">Operations console</span>
      </span>
      <AccountMenu />
    </nav>
  );
}
