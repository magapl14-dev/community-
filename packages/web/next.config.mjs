import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@qd/shared'],
  experimental: {
    typedRoutes: true,
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.yandexcloud.net' },
      { protocol: 'https', hostname: '*.quantum-dag.ru' },
    ],
  },
}

// withSentryConfig — обёртка, которая в build-time подцепляет загрузку source maps
// и плагины Sentry. Без DSN / AUTH_TOKEN остаётся no-op для runtime, но сборка проходит.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
})
