import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow catalog images from any HTTPS host (admin-entered URLs) without crashing `next/image` at runtime.
    remotePatterns: [
      { protocol: "https", hostname: "**", pathname: "/**" },
      { protocol: "http", hostname: "**", pathname: "/**" },
    ],
  },
};

export default nextConfig;
