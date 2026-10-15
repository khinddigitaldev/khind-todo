import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The NCR pages were renamed MDR (Part A, 2026-10-15); keep old links working.
  async redirects() {
    return [
      { source: "/ncrs", destination: "/mdrs", permanent: true },
      { source: "/ncrs/:id", destination: "/mdrs/:id", permanent: true },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
