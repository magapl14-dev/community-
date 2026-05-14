import type { FastifyInstance } from 'fastify'
import { paginationSchema } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { conflict, forbidden, notFound } from '../lib/errors.js'
import { cancelEventReminders, scheduleEventReminders } from '../jobs/queues.js'
import { logger } from '../lib/logger.js'

export async function eventsRoutes(app: FastifyInstance) {
  // GET /events — публично виден список published
  app.get('/', async (req) => {
    const { page, limit } = paginationSchema.parse(req.query)
    const where = { status: 'published' as const }
    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startAt: 'asc' },
      }),
      prisma.event.count({ where }),
    ])
    return { items, page, limit, total }
  })

  // GET /events/:id
  app.get<{ Params: { id: string } }>('/:id', async (req) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { registrations: true } } },
    })
    if (!event || event.status !== 'published') throw notFound()
    return event
  })

  // POST /events/:id/register — UC-10 (SELECT FOR UPDATE для capacity)
  app.post<{ Params: { id: string } }>(
    '/:id/register',
    { preHandler: [app.authenticate, app.requireActiveMembership] },
    async (req) => {
      const userId = req.currentUser!.id
      const eventId = req.params.id

      return prisma.$transaction(async (tx) => {
        // SELECT … FOR UPDATE через raw SQL
        const rows = await tx.$queryRaw<
          Array<{ id: string; capacity: number | null; start_at: Date; status: string }>
        >`SELECT id, capacity, start_at, status FROM events WHERE id = ${eventId}::uuid FOR UPDATE`

        const evt = rows[0]
        if (!evt) throw notFound()
        if (evt.status !== 'published') throw forbidden('forbidden')
        if (evt.start_at.getTime() < Date.now()) throw conflict('event_started')

        const existing = await tx.eventRegistration.findUnique({
          where: { eventId_userId: { eventId, userId } },
        })
        if (existing && existing.status !== 'cancelled') {
          throw conflict('already_registered')
        }

        if (evt.capacity !== null) {
          const count = await tx.eventRegistration.count({
            where: { eventId, status: { not: 'cancelled' } },
          })
          if (count >= evt.capacity) throw conflict('no_capacity')
        }

        const reg = await tx.eventRegistration.upsert({
          where: { eventId_userId: { eventId, userId } },
          create: { eventId, userId, status: 'registered' },
          update: { status: 'registered', cancelledAt: null },
        })

        // Планируем reminders ВНУТРИ транзакции невозможно (внешний Redis),
        // но безопасно — даже при rollback напоминание просто проверит регистрацию.
        scheduleEventReminders(eventId, userId, evt.start_at).catch((err) =>
          logger.error({ err, eventId, userId }, 'scheduleEventReminders failed'),
        )

        return reg
      })
    },
  )

  // DELETE /events/:id/register
  app.delete<{ Params: { id: string } }>(
    '/:id/register',
    { preHandler: [app.authenticate, app.requireActiveMembership] },
    async (req) => {
      const userId = req.currentUser!.id
      const eventId = req.params.id

      const event = await prisma.event.findUnique({ where: { id: eventId } })
      if (!event) throw notFound()
      if (event.startAt.getTime() < Date.now()) throw conflict('event_started')

      await prisma.eventRegistration.update({
        where: { eventId_userId: { eventId, userId } },
        data: { status: 'cancelled', cancelledAt: new Date() },
      })

      cancelEventReminders(eventId, userId).catch((err) =>
        logger.error({ err, eventId, userId }, 'cancelEventReminders failed'),
      )

      return { ok: true }
    },
  )

  // GET /events/:id/attendees
  app.get<{ Params: { id: string } }>(
    '/:id/attendees',
    { preHandler: [app.authenticate, app.requireActiveMembership] },
    async (req) => {
      return prisma.eventRegistration.findMany({
        where: { eventId: req.params.id, status: { not: 'cancelled' } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              member: { select: { position: true, company: true } },
            },
          },
        },
      })
    },
  )
}
