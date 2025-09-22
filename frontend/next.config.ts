// frontend/next.config.ts - Environment-configurable
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API rewrites for development (helps with CORS) - now configurable
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost';
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '8000';
      const backendProtocol = process.env.NEXT_PUBLIC_BACKEND_PROTOCOL || 'http';
      const backendUrl = `${backendProtocol}://${backendHost}:${backendPort}`;
      
      return [
        {
          source: '/api/v1/:path*',
          destination: `${backendUrl}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },
  
  // Enable source maps in development
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
  
  // Optimize images
  images: {
    domains: [
      'localhost',
      process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost',
      ...(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_DOMAINS?.split(',') || [])
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;