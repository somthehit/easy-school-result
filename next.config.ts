import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly set Turbopack root to avoid workspace root inference warnings
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
