import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly set Turbopack root to avoid workspace root inference warnings
  turbopack: {
    root: __dirname,
  },
  // Vercel-compatible configuration
  experimental: {
    serverComponentsExternalPackages: ['postgres']
  },
  // Disable ESLint during build to prevent build failures from warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
