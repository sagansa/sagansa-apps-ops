import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const DEFAULT_API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-ops.sagansa.id'
  : 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const apiBaseUrl = (process.env.API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/api\/?$/, '');
    const storageBaseUrl = (process.env.STORAGE_BASE_URL || apiBaseUrl).replace(/\/storage\/?$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
      {
        source: '/backend-storage/:path*',
        destination: `${storageBaseUrl}/storage/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
