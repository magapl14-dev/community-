import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MEMBERSHIP_PLANS } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { addDays } from 'date-fns'
import { conflict } from '../lib/errors.js'
import { createPayment } from '../lib/yukassa.js'
import { env } from '../lib/env.js'

const createPaymentSchema = z.object({
  plan: z.enum(['base']).default('base'),
  returnUrl: z.string().url().optional(),
})

export async function paymentsRoutes(app: FastifyInstance) {
  // POST /payments/create — UC-23
  app.post('/create', { preHandler: [app.authenticate] }, async (req) => {
    const { plan, returnUrl } = createPaymentSchema.parse(req.body ?? {})
    const user = req.currentUser!

    // Анти-дубль: если pending < 24ч — переиспользовать
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const pending = await prisma.membership.findFirst({
      where: { userId: user.id, status: 'pending', createdAt: { gte: since } },
    })
    if (pending) throw conflict('payment_pending', 'У вас уже есть незавершённая оплата')

    const planConfig = MEMBERSHIP_PLANS[plan]
    const description = `Членство Quantum Dagestan — ${plan} — 12 месяцев`

    if (!env.YUKASSA_SHOP_ID) {
      throw conflict('payments_not_configured', 'Платежи временно недоступны')
    }

    // Создаём pending заранее, чтобы получить id для metadata, затем привязываем paymentId
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        plan,
        amount: planConfig.priceKopeks,
        status: 'pending',
        expiresAt: addDays(new Date(), planConfig.durationDays),
        paymentMethod: 'yukassa',
      },
    })

    try {
      const payment = await createPayment({
        amountKopeks: planConfig.priceKopeks,
        description,
        returnUrl: returnUrl ?? 'https://quantum-dag.ru/cabinet/billing',
        metadata: { membershipId: membership.id, userId: user.id },
        receipt: {
          customerEmail: user.email,
          customerPhone: user.member?.phone ?? null,
          description,
          amountKopeks: planConfig.priceKopeks,
        },
      })

      await prisma.membership.update({
        where: { id: membership.id },
        data: { paymentId: payment.id },
      })

      return { membershipId: membership.id, confirmationUrl: payment.confirmation.confirmation_url }
    } catch (err) {
      // Откатить созданное pending, чтобы анти-дубль не блокировал повтор
      await prisma.membership.delete({ where: { id: membership.id } }).catch(() => {})
      throw err
    }
  })

  // GET /payments/history
  app.get('/history', { preHandler: [app.authenticate] }, async (req) => {
    return prisma.membership.findMany({
      where: { userId: req.currentUser!.id },
      orderBy: { createdAt: 'desc' },
    })
  })
}
