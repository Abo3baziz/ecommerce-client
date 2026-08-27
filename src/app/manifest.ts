import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: siteConfig.themeColor,
    icons: [
      { src: "/file.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/vercel.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
