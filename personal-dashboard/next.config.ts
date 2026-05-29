import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '*.app.github.dev',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'cuddly-barnacle-97x7p5gjgp6w37j7x-3000.app.github.dev',
      ],
    },
  },
};

export default nextConfig;
