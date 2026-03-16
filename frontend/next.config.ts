import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "lh3.googleusercontent.com", // Google
      "dgalywyr863hv.cloudfront.net", // Strava
    ],
  },
};

export default nextConfig;
