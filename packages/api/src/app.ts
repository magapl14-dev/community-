import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import { authenticate, requireActiveMembership, requireRole } from './middleware/authenticate.js'
import { errorHandler } from './middleware/error-handler.js'

import { authRoutes } from './routes/auth.js'
import { membersRoutes } from './routes/members.js'
import { eventsRoutes } from './routes/events.js'
import { newsRoutes } from './routes/news.js'
import { applicationsRoutes } from './routes/applications.js'
import { paymentsRoutes } from './routes/payments.js'
import { adminRoutes } from './routes/admin.js'
import { libraryRoutes } from './routes/library.js'
import { uploadRoutes } from './routes/upload.js'
import { webhooksRoutes } from './routes/webhooks.js'
import { healthRoutes } from './routes/health.js'

import type { UserRole } from '@qd/shared'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate
    requireActiveMembership: typeof requireActiveMembership
    requireRole: (...roles: UserRole[]) => ReturnType<typeof requireRole>
  }
}

export async function buildApp() {
  const app = Fastify({
    logger,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB
  })

  // setErrorHandler's handler generic is tied to the pino Logger inferred from `logger` option,
  // and Fastify's exported FastifyRequest defaults to FastifyBaseLogger — minor type-only mismatch.
  app.setErrorHandler(errorHandler as Parameters<typeof app.setErrorHandler>[0])

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, { origin: env.CORS_ORIGINS, credentials: true })
  await app.register(jwt, { secret: env.JWT_SECRET })
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => (req.user as { sub?: string } | undefined)?.sub ?? req.ip,
  })
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB, 1 file
  })

  app.decorate('authenticate', authenticate)
  app.decorate('requireActiveMembership', requireActiveMembership)
  app.decorate('requireRole', requireRole)

  await app.register(healthRoutes, { prefix: '/health' })
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(membersRoutes, { prefix: '/api/v1/members' })
  await app.register(eventsRoutes, { prefix: '/api/v1/events' })
  await app.register(newsRoutes, { prefix: '/api/v1/news' })
  await app.register(applicationsRoutes, { prefix: '/api/v1/applications' })
  await app.register(paymentsRoutes, { prefix: '/api/v1/payments' })
  await app.register(libraryRoutes, { prefix: '/api/v1/library' })
  await app.register(uploadRoutes, { prefix: '/api/v1/upload' })
  await app.register(adminRoutes, { prefix: '/api/v1/admin' })
  await app.register(webhooksRoutes, { prefix: '/api/v1/webhooks' })

  return app
}
