import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add headers for Cross-Origin Isolation required by ffmpeg-wasm
  async headers() {
    return [
      {
        source: '/:path*', // Apply to all paths
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
