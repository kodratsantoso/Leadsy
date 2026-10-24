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
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "leadsy.virtuenet.space",
          },
        ],
        destination: "https://leadsy.tech/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "leadgen.virtuenet.space",
          },
        ],
        destination: "https://leadsy.tech/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;