import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/BreakFree_Coffee",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
