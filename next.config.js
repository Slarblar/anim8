/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/scoop', destination: '/scoop/index.html' }];
  },
  async headers() {
    return [{ source: '/scoop/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }];
  },
  async redirects() {
    return [
      {
        source: '/apply',
        destination: '/apply/index.html',
        permanent: false,
      },
      {
        source: '/contact',
        destination: '/contact/index.html',
        permanent: false,
      },
      {
        source: '/clients/turnemsideways-2026',
        destination: '/clients/turnemsideways2026',
        permanent: true,
      },
      {
        source: '/clients/turnemsideways-2026/:path*',
        destination: '/clients/turnemsideways2026/:path*',
        permanent: true,
      },
      {
        source: '/clients/turnemsideways',
        destination: '/clients/turnemsideways2026',
        permanent: true,
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
    serverComponentsExternalPackages: ['jsdom', '@mozilla/readability'],
  },
}

module.exports = nextConfig

