"use client";

import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  Package,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/features/auth/session-context";

export function AccountMenu() {
  const { user, isAdmin, signOut, isLoading } = useSession();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">Register</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserRound className="size-4" aria-hidden />
          Account
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound aria-hidden />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">
            <Package aria-hidden />
            My orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/sessions">
            <Settings2 aria-hidden />
            Devices &amp; sessions
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck aria-hidden />
                Admin console
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
