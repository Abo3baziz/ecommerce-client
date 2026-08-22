"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KeyRound,
  Mail,
  MapPin,
  Monitor,
  Smartphone,
  Star,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AuthGate } from "@/components/guards";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/account", label: "Profile", icon: UserRound, exact: true },
  { href: "/account/password", label: "Password", icon: KeyRound },
  { href: "/account/email", label: "Email", icon: Mail },
  { href: "/account/phone", label: "Phone", icon: Smartphone },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/reviews", label: "My reviews", icon: Star },
  { href: "/account/sessions", label: "Sessions", icon: Monitor },
];

function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <h1 className="mb-4 px-3 text-lg font-semibold">Your account</h1>
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </AuthGate>
  );
}
