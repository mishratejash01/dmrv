import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives in a nested folder; pin the workspace root to silence
  // the multiple-lockfile inference warning.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gjogkvkrkkofqusjdnsk.supabase.co" },
    ],
  },
};

export default nextConfig;
