import { StorefrontHeader } from "@/components/layout/storefront-header";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { EmailVerificationBanner } from "@/features/auth/email-verification-banner";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />
      <EmailVerificationBanner />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
      <StorefrontFooter />
    </div>
  );
}
