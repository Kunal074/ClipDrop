/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Cloudflare R2 public URLs
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflarestorage.com',
      },
    ],
  },
  // Keep Prisma out of Next.js bundle (runs server-side only)
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
