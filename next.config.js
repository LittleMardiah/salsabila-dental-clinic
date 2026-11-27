/** @type {import('next').NextConfig} */

const isProduction = process.env.NODE_ENV === 'production'

// Next.js injects inline bootstrap scripts and styles, and the app loads its
// fonts from Google Fonts. The policy therefore allows inline scripts/styles
// but keeps every other source origin pinned to the app and Supabase.
// `unsafe-eval` is only needed by the development server (HMR/React refresh).
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${
    isProduction ? '' : ' ws://localhost:* http://localhost:*'
  }`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'self'",
  isProduction ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ...(isProduction
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ESLint 8 hangs on this Node runtime while loading eslint-plugin-react.
  // Type safety is still enforced by `tsc --noEmit` and `next build`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Next 14's default prerender worker pool hangs on newer Node runtimes.
    workerThreads: false,
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

module.exports = nextConfig;
