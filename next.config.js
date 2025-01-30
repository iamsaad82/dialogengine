/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['dialog-engine.vercel.app'],
    unoptimized: true
  },
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

module.exports = nextConfig;
