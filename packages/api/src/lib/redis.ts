import { Redis } from 'ioredis'
import { env } from './env.js'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // требуется для BullMQ
})

export const redisCache = new Redis(env.REDIS_URL)

redis.on('error', (err: Error) => console.error('[redis] error:', err.message))
