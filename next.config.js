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
  }
};

module.exports = nextConfig;
