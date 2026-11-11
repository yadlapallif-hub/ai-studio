import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@francis/shared"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
