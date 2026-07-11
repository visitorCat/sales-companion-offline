import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: "/sales-companion-offline",
  assetPrefix: "/sales-companion-offline/",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
