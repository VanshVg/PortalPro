import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@portalpro/ui",
    "@portalpro/utils",
    "@portalpro/types",
    "@portalpro/auth",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },
  experimental: {
    // Prisma must not be webpack-bundled, or its runtime __dirname stops pointing
    // at the generated client dir and the .so.node engine becomes unfindable.
    serverComponentsExternalPackages: ["@prisma/client", "@portalpro/database"],
    // Trace from the monorepo root so files outside apps/portal can be included.
    outputFileTracingRoot: monorepoRoot,
    // Force-copy the Prisma engine binary + generated client into the Vercel output.
    outputFileTracingIncludes: {
      "*": [
        "../../packages/database/src/generated/client/**/*",
        "../../packages/database/dist/generated/client/**/*",
      ],
    },
  },
  // Defense-in-depth: serverComponentsExternalPackages sometimes silently fails to
  // externalize Prisma in monorepos with transpilePackages. Force it at the webpack
  // level so the package is left as a runtime require() and not inlined into chunks.
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      config.externals = [
        ({ request }, callback) => {
          if (
            request === "@prisma/client" ||
            request === "@portalpro/database" ||
            request?.startsWith("@portalpro/database/")
          ) {
            return callback(null, "commonjs " + request);
          }
          return callback();
        },
        ...existingExternals,
      ];
    }
    return config;
  },
};

export default nextConfig;
