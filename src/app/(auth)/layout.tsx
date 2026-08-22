import { Suspense } from "react";
import { PublicOnlyGate } from "@/components/guards";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Suspense>
          <PublicOnlyGate>{children}</PublicOnlyGate>
        </Suspense>
      </div>
    </div>
  );
}
