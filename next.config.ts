import type { NextConfig } from "next";

// Resolve the backend at build time. Requests stay on the public app origin.
const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const apiRelay = Boolean(process.env.VERCEL_ENV && apiOrigin?.startsWith("https://"));

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_API_RELAY: apiRelay ? "true" : "false" },
  async rewrites() {
    return apiRelay ? [
      { source: "/leap-api/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/leap-api/health", destination: `${apiOrigin}/health` },
    ] : [];
  },
  async headers() {
    return apiRelay ? [{ source: "/leap-api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }] : [];
  },
};

export default nextConfig;
