"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MailWarning, X } from "lucide-react";
import { useSession } from "./session-context";

export function EmailVerificationBanner() {
  const { user } = useSession();
  const pathname = usePathname();
  const [dismissedOn, setDismissedOn] = useState<string | null>(null);

  if (!user || user.email_verified) {
    return null;
  }
  if (dismissedOn === pathname) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900">
      <MailWarning className="size-4 shrink-0" aria-hidden />
      <span>
        Please verify your email address. Check your inbox for the verification
        link.
      </span>
      <Link
        href="/account/email"
        className="font-medium underline underline-offset-4"
      >
        Manage email
      </Link>
      <button
        type="button"
        onClick={() => setDismissedOn(pathname)}
        aria-label="Dismiss verification banner"
        className="ml-1 rounded p-1 hover:bg-amber-200"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
