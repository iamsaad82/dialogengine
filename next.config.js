const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['dialog-engine.vercel.app', 'localhost', '127.0.0.1', 'dialog-ai-web.de', 'dialog-engine.onrender.com'],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'dialog-engine.vercel.app',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'dialog-ai-web.de',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'dialog-engine.onrender.com',
        pathname: '/uploads/**',
      }
    ]
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false
  },
  eslint: {
    ignoreDuringBuilds: false
  },
  env: {
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING
  }
};

module.exports = withBundleAnalyzer(nextConfig);
