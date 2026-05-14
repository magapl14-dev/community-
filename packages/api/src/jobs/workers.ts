import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'
import { prisma } from '../lib/db.js'
import { sendPushToUser } from '../lib/push.js'
import type { EventReminderJob } from './queues.js'

export function startWorkers() {
  const pushWorker = new Worker<EventReminderJob>(
    'push',
    async (job) => {
      const { eventId, userId, type } = job.data

      const event = await prisma.event.findUnique({ where: { id: eventId } })
      if (!event || event.status !== 'published') {
        logger.info({ eventId }, 'event not active — skip reminder')
        return
      }

      // Проверяем что пользователь всё ещё зарегистрирован
      const reg = await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      })
      if (!reg || reg.status === 'cancelled') {
        logger.info({ eventId, userId }, 'registration cancelled — skip reminder')
        return
      }

      const when = type === '24h' ? 'завтра' : 'через час'
      await sendPushToUser(userId, {
        title: event.title,
        body: `Напоминание: мероприятие ${when}`,
        data: { type: 'event_reminder', eventId },
      })
    },
    { connection: redis, concurrency: 5 },
  )

  pushWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'push job failed'))
  return [pushWorker]
}
