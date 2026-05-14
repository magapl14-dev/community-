import * as Sentry from '@sentry/node'
import { env, isProd } from './env.js'
import { logger } from './logger.js'

let initialized = false

export function initSentry(): void {
  if (initialized) return
  if (!env.SENTRY_DSN) {
    if (isProd) logger.warn('SENTRY_DSN не задан — ошибки в Sentry отправляться не будут')
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: isProd ? 0.1 : 0,
    profilesSampleRate: 0,
  })
  initialized = true
  logger.info('Sentry initialised')
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return
  Sentry.captureException(err, context ? { extra: context } : undefined)
}

export function sentryEnabled(): boolean {
  return initialized
}
