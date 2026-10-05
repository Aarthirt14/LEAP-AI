import type { NextConfig } from "next";

// Keep this transport change isolated to the redesign preview and its staging API.
const stagingOrigin = "https://leap-ui-v2-staging.onrender.com";
const stagingRelay = process.env.VERCEL_ENV === "preview"
  && process.env.VERCEL_GIT_COMMIT_REF === "redesign/leap-ui-v2"
  && process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") === stagingOrigin;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_STAGING_RELAY: stagingRelay ? "true" : "false" },
  async rewrites() {
    return stagingRelay ? [
      { source: "/leap-api/api/:path*", destination: `${stagingOrigin}/api/:path*` },
      { source: "/leap-api/health", destination: `${stagingOrigin}/health` },
    ] : [];
  },
  async headers() {
    return stagingRelay ? [{ source: "/leap-api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }] : [];
  },
};

export default nextConfig;
