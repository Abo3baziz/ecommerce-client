import type { NextConfig } from "next";

// Server-side origin for the /api/v1 rewrite proxy. Trailing slashes and
// whitespace are stripped so a sloppy env value can't produce "//api/v1".
const apiOrigin = (process.env.API_ORIGIN ?? "http://localhost:3000")
  .trim()
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
    // ImageKit is the primary CDN for product/variant uploads; keep patterns explicit.
    // Add additional hosts here if product images come from other CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "*.imagekit.io" },
      { protocol: "https", hostname: "*.ik.imagekit.io" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Content-Type", value: "application/xml" }],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Content-Type", value: "text/plain" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
