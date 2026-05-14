import crypto from 'node:crypto'
import { TELEGRAM_AUTH_MAX_AGE_SEC } from '@qd/shared'
import type { TelegramAuthInput } from '@qd/shared'

export function verifyTelegramAuth(data: TelegramAuthInput, botToken: string): boolean {
  const { hash, ...rest } = data

  const dataCheckString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${(rest as Record<string, unknown>)[key]}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  const now = Math.floor(Date.now() / 1000)
  if (now - data.auth_date > TELEGRAM_AUTH_MAX_AGE_SEC) return false

  const a = Buffer.from(computedHash, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}
