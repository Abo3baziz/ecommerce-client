import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI kit demo",
  robots: { index: false, follow: false },
};

export default function DevUiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
