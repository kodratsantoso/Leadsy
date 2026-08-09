import type { NextConfig } from "next";

const internalBackendUrl =
  process.env.API_INTERNAL_URL || "http://backend:8000";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalBackendUrl.replace(/\/$/, "")}/api/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${internalBackendUrl.replace(/\/$/, "")}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;