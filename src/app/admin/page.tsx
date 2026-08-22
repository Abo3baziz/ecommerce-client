"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  FolderTree,
  MessageSquareText,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminQuickCounts } from "@/features/admin/dashboard-api";

interface SectionCardConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  countKey: keyof ReturnType<typeof useAdminQuickCounts>["counts"];
}

const SECTIONS: readonly SectionCardConfig[] = [
  { label: "Products", href: "/admin/products", icon: Package, countKey: "products" },
  { label: "Categories", href: "/admin/categories", icon: FolderTree, countKey: "categories" },
  { label: "Inventory", href: "/admin/inventory", icon: Warehouse, countKey: "inventory" },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart, countKey: "orders" },
  { label: "Reviews", href: "/admin/reviews", icon: MessageSquareText, countKey: "reviews" },
  { label: "Customers", href: "/admin/users", icon: Users, countKey: "customers" },
];

export default function AdminDashboardPage() {
  const { counts, isLoading, isError, refetch } = useAdminQuickCounts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick overview across every section of the store.
        </p>
      </div>

      {isError ? (
        <ErrorState
          error={{ status: 0, message: "Could not load the section counts." }}
          onRetry={() => refetch()}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ label, href, icon: Icon, countKey }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/30">
              <CardContent className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </span>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <span className="text-3xl font-semibold tabular-nums">
                      {counts[countKey] ?? "—"}
                    </span>
                  )}
                </div>
                <ArrowUpRight
                  className="size-5 text-muted-foreground/50 transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/products">Manage products</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/orders">Review orders</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/reviews">Moderate reviews</Link>
        </Button>
      </div>
    </div>
  );
}
