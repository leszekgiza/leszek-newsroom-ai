import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["edge-tts"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
