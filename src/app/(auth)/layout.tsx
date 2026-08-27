import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PublicOnlyGate } from "@/components/guards";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link
        href="/"
        className="label-caps mb-6 transition-colors hover:text-foreground"
      >
        ← Back to storefront
      </Link>
      <div className="w-full max-w-md border bg-card shadow-[0_10px_30px_-18px_oklch(0_0_0/0.4)]">
        <p className="label-caps border-b bg-secondary px-4 py-2 text-foreground">
          Account access form
        </p>
        <Suspense>
          <PublicOnlyGate>{children}</PublicOnlyGate>
        </Suspense>
      </div>
    </div>
  );
}
