export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md border bg-card shadow-[0_10px_30px_-18px_oklch(0_0_0/0.4)]">
        {children}
      </div>
    </div>
  );
}
