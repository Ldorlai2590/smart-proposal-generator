import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  transpilePackages: ['@repo/ui'],
}

export default nextConfig
