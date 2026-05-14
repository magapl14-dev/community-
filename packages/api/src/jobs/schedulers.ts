import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { logger } from '../lib/logger.js'
import { membershipExpiryReminder, updatePastEvents } from './cron.js'

// Отдельная очередь для cron-задач — repeat-jobs хранятся в Redis,
// при перезапуске сервиса не дублируются (BullMQ дедуплицирует по jobId).
export const cronQueue = new Queue('cron', { connection: redis })

const TZ = 'Europe/Moscow' // UTC+3

const SCHEDULES = [
  { name: 'membership-expiry-reminder', pattern: '0 8 * * *', tz: TZ }, // 08:00 ежедневно
  { name: 'update-past-events', pattern: '1 0 * * *', tz: TZ }, // 00:01 ежедневно
] as const

export async function registerCronSchedules() {
  for (const s of SCHEDULES) {
    await cronQueue.add(
      s.name,
      {},
      {
        repeat: { pattern: s.pattern, tz: s.tz },
        jobId: `cron-${s.name}`,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    )
  }
  logger.info({ jobs: SCHEDULES.map((s) => s.name) }, 'cron schedules registered')
}

export function startCronWorker() {
  const worker = new Worker(
    'cron',
    async (job) => {
      logger.info({ name: job.name }, 'cron job started')
      switch (job.name) {
        case 'membership-expiry-reminder':
          await membershipExpiryReminder()
          break
        case 'update-past-events':
          await updatePastEvents()
          break
        default:
          logger.warn({ name: job.name }, 'unknown cron job')
      }
    },
    { connection: redis, concurrency: 1 },
  )

  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'cron job failed'))
  return worker
}
