import type { NextConfig } from 'next'


const nextConfig: NextConfig = {
  // Removed static export - using standard Next.js for dynamic routes
  // output: 'export',
  
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
