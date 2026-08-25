import type { NextConfig } from "next";

// Server-side origin for the /api/v1 rewrite proxy. Trailing slashes and
// whitespace are stripped so a sloppy env value can't produce "//api/v1".
const apiOrigin = (process.env.API_ORIGIN ?? "http://localhost:3000")
  .trim()
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
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
