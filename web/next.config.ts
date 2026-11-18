import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // pdf-parse reads test files at require() time; bundling it breaks that.
  // Marking it external tells Next.js to leave it as a plain Node require.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
