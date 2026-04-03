/** @type {import('next').NextConfig} */
const nextConfig = {
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
