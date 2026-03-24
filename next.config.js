/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/apply',
        destination: '/apply/index.html',
        permanent: false,
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vimeo.com',
      },
      {
        protocol: 'https',
        hostname: 'i.vimeocdn.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['framer-motion'],
  },
}

module.exports = nextConfig

