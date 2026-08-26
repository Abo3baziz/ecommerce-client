import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Overpass_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const overpassMono = Overpass_Mono({
  variable: "--font-overpass-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Storefront",
    template: "%s | Storefront",
  },
  description: "Ecommerce storefront and admin console",
};

const DIRECTION_CONTRACT = `
THESIS: commerce presented as freight paperwork perfected; every surface is a document in a logistics dossier, refusing the generic storefront grid.
OWN-WORLD: paper ground, document ink, customs blue + safety orange on hairline tabular rules; Barlow / Barlow Condensed lettering with Overpass Mono for all data.
STORY: shoppers read the catalog as a manifest; staff work the console as ledgers.
FIRST VIEWPORT (home): masthead rule, oversized condensed headline left, spec table right, barcode strip, category rack signs, label-card catalog grid.
FORM: Swiss freight documentation; seed key 3c3350fb.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${overpassMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div
          hidden
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: `<!-- ${DIRECTION_CONTRACT} -->` }}
        />
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
