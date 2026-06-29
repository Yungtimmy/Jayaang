import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Monorepo: app lives in /web, repo root is one level up
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;