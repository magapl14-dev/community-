import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db.js'
import { redis } from '../lib/redis.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => ({ ok: true, ts: new Date().toISOString() }))

  app.get('/ready', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      const pong = await redis.ping()
      return { ok: true, db: 'up', redis: pong === 'PONG' ? 'up' : 'down' }
    } catch (err) {
      return reply.code(503).send({ ok: false, error: (err as Error).message })
    }
  })
}
