import type { FastifyInstance } from 'fastify'
import { paginationSchema } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { redisCache } from '../lib/redis.js'
import { notFound } from '../lib/errors.js'

const NEWS_CACHE_KEY = 'cache:news:feed'
const NEWS_CACHE_TTL_SEC = 5 * 60 // 5 минут

export async function newsRoutes(app: FastifyInstance) {
  // GET /news — лента (Redis-кеш для первой страницы)
  app.get(
    '/',
    { preHandler: [app.authenticate, app.requireActiveMembership] },
    async (req) => {
      const { page, limit } = paginationSchema.parse(req.query)

      // Кешируем только первую страницу со стандартным лимитом
      const cacheable = page === 1 && limit === 20
      if (cacheable) {
        const cached = await redisCache.get(NEWS_CACHE_KEY)
        if (cached) return JSON.parse(cached)
      }

      const [items, total] = await Promise.all([
        prisma.newsPost.findMany({
          where: { publishedAt: { not: null, lte: new Date() } },
          orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        }),
        prisma.newsPost.count({ where: { publishedAt: { not: null, lte: new Date() } } }),
      ])
      const payload = { items, page, limit, total }

      if (cacheable) {
        await redisCache.setex(NEWS_CACHE_KEY, NEWS_CACHE_TTL_SEC, JSON.stringify(payload))
      }
      return payload
    },
  )

  // POST /news/:id/read — статистика прочтений (Redis HyperLogLog → уникальные читатели)
  app.post<{ Params: { id: string } }>(
    '/:id/read',
    { preHandler: [app.authenticate, app.requireActiveMembership] },
    async (req) => {
      const exists = await prisma.newsPost.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      })
      if (!exists) throw notFound()

      // PFADD идемпотентно — один и тот же userId даёт +0 к count, что нам и нужно
      await redisCache.pfadd(`news:reads:${req.params.id}`, req.currentUser!.id)
      return { ok: true }
    },
  )
}
