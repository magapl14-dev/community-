import { pino } from 'pino'
import { isDev } from './env.js'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  redact: {
    paths: ['password', 'passwordHash', '*.password', 'req.headers.authorization', 'token'],
    censor: '***',
  },
})
