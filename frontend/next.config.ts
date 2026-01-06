import type { NextConfig } from 'next'


const nextConfig: NextConfig = {
  // Static export for deployment (no Node.js server needed)
  output: 'export',
  
  // SSR Alternative: Uncomment below for standalone server deployment
  // output: 'standalone',
  
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
