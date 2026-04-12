import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel-optimized output
  output: "standalone",
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
