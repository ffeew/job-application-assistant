import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  distDir: process.env.E2E_TEST === "1" ? ".next-e2e" : ".next",
};

export default nextConfig;
