import type { NextConfig } from 'next'


const nextConfig: NextConfig = {
  // Standalone output for Docker deployment with full Next.js features
  output: 'standalone',
  
  // Trailing slashes for compatibility
  trailingSlash: true,
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },

  // Enable strict mode for better development experience
  reactStrictMode: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Skip TypeScript errors during build (run separately)
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
