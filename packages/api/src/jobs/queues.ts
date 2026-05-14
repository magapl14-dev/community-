import { Queue } from 'bullmq'
import { redis } from '../lib/redis.js'

export const pushQueue = new Queue('push', { connection: redis })
export const emailQueue = new Queue('email', { connection: redis })

export type EventReminderJob = {
  eventId: string
  userId: string
  type: '24h' | '1h'
}

export async function scheduleEventReminders(eventId: string, userId: string, startAt: Date) {
  const ms24h = startAt.getTime() - Date.now() - 24 * 60 * 60 * 1000
  const ms1h = startAt.getTime() - Date.now() - 60 * 60 * 1000

  if (ms24h > 0) {
    await pushQueue.add(
      'event-reminder',
      { eventId, userId, type: '24h' } satisfies EventReminderJob,
      { delay: ms24h, jobId: `event-${eventId}-user-${userId}-24h` },
    )
  }
  if (ms1h > 0) {
    await pushQueue.add(
      'event-reminder',
      { eventId, userId, type: '1h' } satisfies EventReminderJob,
      { delay: ms1h, jobId: `event-${eventId}-user-${userId}-1h` },
    )
  }
}

export async function cancelEventReminders(eventId: string, userId: string) {
  await pushQueue.remove(`event-${eventId}-user-${userId}-24h`).catch(() => {})
  await pushQueue.remove(`event-${eventId}-user-${userId}-1h`).catch(() => {})
}
