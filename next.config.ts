import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel-optimized output
  output: "standalone",
  // Allow dev assets (HMR/fonts) when accessing from this LAN host.
  allowedDevOrigins: ["172.31.112.12"],
  // Allow cross-origin requests to backend API in dev
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
