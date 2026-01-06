import type { NextConfig } from 'next'


const nextConfig: NextConfig = {
  // Static export for production (generates /out directory)
  output: 'export',
  
  // Trailing slashes for static hosting compatibility
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

  // Skip ESLint during build (run separately)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript errors during build (run separately)
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
