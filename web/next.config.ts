import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents + partialPrefetching are Next.js 16 experimental flags.
  // cacheComponents conflicts with our API route segment configs (runtime/dynamic),
  // and partialPrefetching requires cacheComponents. Neither is needed for this PoC.
};

export default nextConfig;
