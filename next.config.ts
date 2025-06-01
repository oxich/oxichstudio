import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // === MODE STANDALONE ===
  output: "standalone",
  
  // === OPTIMISATIONS BUILD ===
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // === PERFORMANCE ===
  experimental: {
    // ✅ Désactiver en dev pour éviter conflits Electron
    ...(process.env.NODE_ENV !== 'development' && { optimizeCss: true }),
  },
  
  // === DEV CONFIG ===
  ...(process.env.NODE_ENV === 'development' && {
    // Optimisations pour dev avec Electron
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
  
  // === IMAGES ===
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    domains: ['localhost', '127.0.0.1'],
  },
  
  // === SÉCURITÉ ===
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options', 
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
