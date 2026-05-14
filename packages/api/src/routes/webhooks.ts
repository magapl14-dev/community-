import type { FastifyInstance } from 'fastify'
import { addDays } from 'date-fns'
import { MEMBERSHIP_PLANS } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { isIpInRanges, YUKASSA_IP_RANGES } from '../lib/ip-range.js'
import type { YukassaWebhookEvent } from '../lib/yukassa.js'
import { isProd } from '../lib/env.js'
import { notifyKMSubmissions } from '../bot/admin-bot.js'
import { sendPushToUser } from '../lib/push.js'
import { buildMembershipActivatedEmail, sendEmail } from '../lib/email.js'

export async function webhooksRoutes(app: FastifyInstance) {
  // POST /webhooks/yukassa — UC-24
  app.post('/yukassa', async (req, reply) => {
    // 1. Проверка IP (только в проде; в dev — пропускаем для тестов)
    if (isProd && !isIpInRanges(req.ip, YUKASSA_IP_RANGES)) {
      req.log.warn({ ip: req.ip }, 'yukassa webhook from non-whitelisted IP')
      return reply.code(403).send({ code: 'forbidden_ip' })
    }

    const event = req.body as YukassaWebhookEvent
    const payment = event.object

    if (event.event === 'payment.succeeded') {
      // 2. Идемпотентность — повторная доставка должна быть no-op с 200
      const existing = await prisma.membership.findUnique({ where: { paymentId: payment.id } })
      if (!existing) {
        req.log.warn({ paymentId: payment.id }, 'webhook for unknown payment')
        return reply.code(200).send({ ok: true })
      }
      if (existing.status === 'active') {
        return reply.code(200).send({ ok: true })
      }

      // 3. Активируем членство (без транзакции на уровне БД — атомарный update)
      const updated = await prisma.membership.update({
        where: { paymentId: payment.id },
        data: {
          status: 'active',
          startsAt: new Date(),
          expiresAt: addDays(new Date(), MEMBERSHIP_PLANS.base.durationDays),
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      })

      // 4. Side-effects — не блокируем 200
      notifyKMSubmissions(
        `💰 Оплата: ${updated.user.name} — ${updated.amount / 100} ₽`,
      ).catch((err) => logger.error({ err }, 'notifyKM failed'))

      sendPushToUser(updated.user.id, {
        title: 'Членство активировано',
        body: `Оплата прошла. Действует до ${updated.expiresAt.toLocaleDateString('ru-RU')}.`,
        data: { type: 'membership_activated', membershipId: updated.id },
      }).catch((err) => logger.error({ err }, 'membership-activated push failed'))

      if (updated.user.email) {
        sendEmail({
          ...buildMembershipActivatedEmail(updated.user.name, updated.amount, updated.expiresAt),
          to: updated.user.email,
        }).catch((err) => logger.error({ err }, 'membership-activated email failed'))
      }

      return reply.code(200).send({ ok: true })
    }

    if (event.event === 'payment.canceled') {
      await prisma.membership
        .update({ where: { paymentId: payment.id }, data: { status: 'cancelled' } })
        .catch(() => {
          /* idempotent */
        })
    }

    return reply.code(200).send({ ok: true })
  })

  // POST /webhooks/telegram — webhook от user-бота (если используется webhook вместо long-poll)
  app.post('/telegram', async (_req, reply) => {
    return reply.send({ ok: true })
  })
}
