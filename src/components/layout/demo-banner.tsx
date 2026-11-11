"use client";

import { Eye } from "lucide-react";
import { useSession } from "@/features/auth/session-context";

/**
 * Persistent read-only notice shown across the admin console while an
 * anonymous visitor explores the public demo. Hidden for signed-in admins.
 */
export function DemoModeBanner() {
  const { isReadOnlyDemo } = useSession();

  if (!isReadOnlyDemo) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b bg-amber-100 px-4 py-2 text-center text-amber-950"
    >
      <Eye className="size-4 shrink-0" aria-hidden />
      <p className="text-sm">
        <span className="font-semibold">Demo mode — read-only.</span>{" "}
        You are viewing a live snapshot of the admin console with realistic
        data. Browsing, filtering and charts work; all changes are disabled.
      </p>
    </div>
  );
}
