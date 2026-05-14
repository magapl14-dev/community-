import { prisma } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { differenceInDays, format } from 'date-fns'
import { MEMBERSHIP_REMINDER_DAYS, pluralizeRu } from '@qd/shared'
import { sendPushToUser } from '../lib/push.js'

// Запускается ежедневно в 08:00 (UTC+3) через BullMQ repeat-cron
export async function membershipExpiryReminder() {
  const atRisk = await prisma.membership.findMany({
    where: {
      status: 'active',
      expiresAt: { gte: new Date(), lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    },
  })

  let sent = 0
  for (const m of atRisk) {
    const daysLeft = differenceInDays(m.expiresAt, new Date())
    if (!(MEMBERSHIP_REMINDER_DAYS as readonly number[]).includes(daysLeft)) continue
    if (m.reminderSentAt && isSameDay(m.reminderSentAt, new Date())) continue

    const dayWord = pluralizeRu(daysLeft, ['день', 'дня', 'дней'])
    await sendPushToUser(m.userId, {
      title: 'Quantum Dagestan',
      body: `Членство истекает через ${daysLeft} ${dayWord}. Продлите до ${format(m.expiresAt, 'dd.MM')}`,
      data: { type: 'membership_expiry', membershipId: m.id, daysLeft },
    })

    await prisma.membership.update({
      where: { id: m.id },
      data: { reminderSentAt: new Date() },
    })
    sent++
  }

  // Перевод истёкших в expired
  const { count: expiredCount } = await prisma.membership.updateMany({
    where: { status: 'active', expiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  })

  logger.info({ sent, expiredCount }, 'membership expiry reminder done')
}

// Запускается в 00:01 (UTC+3): published мероприятия с start_at < now → past
export async function updatePastEvents() {
  const { count } = await prisma.event.updateMany({
    where: { status: 'published', startAt: { lt: new Date() } },
    data: { status: 'past' },
  })
  if (count > 0) logger.info({ count }, 'events marked as past')
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}
