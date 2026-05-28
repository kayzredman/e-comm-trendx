import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@trendmarga/ui', '@trendmarga/types', '@trendmarga/config'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Local-dev API serves uploads at /uploads/...
      { protocol: 'http', hostname: 'localhost' },
      // Cloudflare R2 public buckets (custom domain or r2.dev)
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      // Railway-hosted API serving uploads in staging/prod
      { protocol: 'https', hostname: '*.up.railway.app' },
    ],
  },
};

export default nextConfig;
