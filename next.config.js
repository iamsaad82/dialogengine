const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      '127.0.0.1',
      'dialog-ai-web.de',
      'dialog-engine.onrender.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dialog-engine.onrender.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  env: {
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING
  }
};

module.exports = withBundleAnalyzer(nextConfig);
