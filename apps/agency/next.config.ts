import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@portalpro/ui",
    "@portalpro/utils",
    "@portalpro/types",
    "@portalpro/auth",
    "@portalpro/database",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;
