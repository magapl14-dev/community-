import type { FastifyInstance } from 'fastify'
import { applicationSchema } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { stripHtml } from '../lib/sanitize.js'
import { ApiError, conflict } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { notifyNewApplication } from '../bot/admin-bot.js'
import { verifySmartCaptcha } from '../lib/smartcaptcha.js'

export async function applicationsRoutes(app: FastifyInstance) {
  // POST /applications — публичная форма
  app.post('/', async (req) => {
    const input = applicationSchema.parse(req.body)
    const ip =
      (req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()) ?? req.ip

    // 1. SmartCaptcha
    const captchaOk = await verifySmartCaptcha(input.captchaToken, ip)
    if (!captchaOk) throw new ApiError(400, 'captcha_failed', 'Капча не пройдена')

    // 2. Дедупликация по телефону за 24 часа
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await prisma.application.findFirst({
      where: { phone: input.phone, createdAt: { gte: since } },
    })
    if (recent) throw conflict('already_submitted', 'Заявка уже отправлена. Мы свяжемся с вами.')

    const created = await prisma.application.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        telegram: input.telegram,
        position: input.position,
        industry: input.industry,
        revenueRange: input.revenueRange,
        motivation: stripHtml(input.motivation),
        consentGivenAt: new Date(),
        consentIp: ip,
      },
    })

    // 3. Уведомление КМ — не блокируем
    notifyNewApplication(created.id).catch((err) =>
      logger.error({ err, applicationId: created.id }, 'notifyNewApplication failed'),
    )

    return { id: created.id, ok: true }
  })
}
