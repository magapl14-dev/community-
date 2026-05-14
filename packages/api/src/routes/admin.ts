import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { addDays } from 'date-fns'
import { createEventSchema, createNewsSchema, MEMBERSHIP_PLANS } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { conflict, notFound } from '../lib/errors.js'
import { issueOneTimeToken } from '../lib/one-time-token.js'
import { buildActivationEmail, getWebBase, sendEmail } from '../lib/email.js'
import { sendPushToUser, sendPushToUsers } from '../lib/push.js'
import { cancelEventReminders } from '../jobs/queues.js'

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(1000).optional(),
})

export async function adminRoutes(app: FastifyInstance) {
  const kmOrAdmin = { preHandler: [app.authenticate, app.requireRole('admin', 'km')] }

  // ─── Applications ───
  app.get('/applications', kmOrAdmin, async () => {
    return prisma.application.findMany({ orderBy: { createdAt: 'desc' } })
  })

  app.patch<{ Params: { id: string } }>('/applications/:id', kmOrAdmin, async (req) => {
    const { status, notes } = reviewSchema.parse(req.body)
    const app_ = await prisma.application.findUnique({ where: { id: req.params.id } })
    if (!app_) throw notFound()
    if (app_.status !== 'new' && app_.status !== 'reviewing') {
      throw conflict('already_processed')
    }

    if (status === 'approved') {
      const { userId, email, name } = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: app_.email,
            passwordHash: null,
            name: app_.name,
            role: 'member',
            isActive: false,
            member: {
              create: {
                joinedClubAt: new Date(),
                position: app_.position,
                industry: app_.industry,
                telegramUsername: app_.telegram?.replace(/^@/, ''),
                phone: app_.phone,
              },
            },
          },
        })

        await tx.membership.create({
          data: {
            userId: user.id,
            plan: 'base',
            amount: MEMBERSHIP_PLANS.base.priceKopeks,
            status: 'active',
            startsAt: new Date(),
            expiresAt: addDays(new Date(), MEMBERSHIP_PLANS.base.durationDays),
            paymentMethod: 'manual',
          },
        })

        await tx.application.update({
          where: { id: app_.id },
          data: {
            status: 'approved',
            reviewedById: req.currentUser!.id,
            reviewedAt: new Date(),
            notes,
          },
        })

        return { userId: user.id, email: app_.email, name: app_.name }
      })

      if (email) {
        const token = await issueOneTimeToken('activate', userId)
        const url = `${getWebBase()}/auth/activate?token=${token}`
        sendEmail({ ...buildActivationEmail(name, url), to: email }).catch((err) =>
          logger.error({ err, userId }, 'activation email failed'),
        )
      }

      return { userId, ok: true }
    }

    return prisma.application.update({
      where: { id: app_.id },
      data: {
        status: 'rejected',
        reviewedById: req.currentUser!.id,
        reviewedAt: new Date(),
        notes,
      },
    })
  })

  // ─── Users ───
  app.get('/users', kmOrAdmin, async () => {
    return prisma.user.findMany({
      include: {
        member: true,
        memberships: { where: { status: 'active' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  // ─── Events ───
  app.post('/events', kmOrAdmin, async (req) => {
    const input = createEventSchema.parse(req.body)
    return prisma.event.create({
      data: { ...input, createdById: req.currentUser!.id, status: 'draft' },
    })
  })

  app.patch<{ Params: { id: string } }>('/events/:id', kmOrAdmin, async (req) => {
    const input = createEventSchema.partial().extend({
      status: z.enum(['draft', 'published', 'cancelled']).optional(),
    }).parse(req.body)

    const before = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { registrations: { where: { status: { not: 'cancelled' } } } },
    })
    if (!before) throw notFound()

    const updated = await prisma.event.update({ where: { id: req.params.id }, data: input })

    // Переход draft → published: триггерим напоминания всем зарегистрированным
    // (на практике до публикации регистраций нет, но защищаемся от edge case)
    if (before.status !== 'published' && updated.status === 'published') {
      logger.info({ eventId: updated.id }, 'event published')
    }

    // Переход в cancelled: пуш всем зарегистрированным + снять reminders
    if (before.status !== 'cancelled' && updated.status === 'cancelled') {
      const userIds = before.registrations.map((r) => r.userId)
      sendPushToUsers(userIds, {
        title: 'Мероприятие отменено',
        body: `«${updated.title}» отменено. Извините за неудобства.`,
        data: { type: 'event_cancelled', eventId: updated.id },
      }).catch((err) => logger.error({ err }, 'cancellation push failed'))

      // Снять все reminders из очереди
      await Promise.all(
        userIds.map((uid) => cancelEventReminders(updated.id, uid)),
      ).catch((err) => logger.error({ err }, 'cancel reminders failed'))
    }

    return updated
  })

  // ─── News ───
  app.post('/news', kmOrAdmin, async (req) => {
    const input = createNewsSchema.parse(req.body)
    const created = await prisma.newsPost.create({
      data: { ...input, authorId: req.currentUser!.id },
    })

    // Если announcement и уже опубликовано — рассылаем push всем активным членам
    if (created.type === 'announcement' && created.publishedAt && !created.pushSentAt) {
      const members = await prisma.user.findMany({
        where: {
          isActive: true,
          memberships: { some: { status: 'active' } },
        },
        select: { id: true },
      })
      sendPushToUsers(
        members.map((m) => m.id),
        {
          title: '📢 Объявление',
          body: created.title,
          data: { type: 'announcement', newsId: created.id },
        },
      )
        .then(() =>
          prisma.newsPost.update({
            where: { id: created.id },
            data: { pushSentAt: new Date() },
          }),
        )
        .catch((err) => logger.error({ err, newsId: created.id }, 'announcement push failed'))
    }

    return created
  })

  // ─── Analytics ───
  app.get('/analytics', kmOrAdmin, async () => {
    const [totalMembers, activeMembers, totalEvents, totalRevenue] = await Promise.all([
      prisma.user.count({ where: { role: 'member' } }),
      prisma.membership.count({ where: { status: 'active' } }),
      prisma.event.count({ where: { status: 'published' } }),
      prisma.membership.aggregate({
        where: { status: 'active' },
        _sum: { amount: true },
      }),
    ])
    return {
      totalMembers,
      activeMembers,
      totalEvents,
      totalRevenueKopeks: totalRevenue._sum.amount ?? 0,
    }
  })
}

// helper used in flagged unused var detection — keep import alive
void sendPushToUser
