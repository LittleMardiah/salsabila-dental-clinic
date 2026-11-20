/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

module.exports = nextConfig;
