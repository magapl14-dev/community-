import crypto from 'node:crypto'
import { redisCache } from './redis.js'

// ─── One-time tokens в Redis ───
// Используется для активации аккаунта (48ч) и сброса пароля (24ч).
// Ключ: ott:{purpose}:{tokenHash} → userId. После использования удаляется.

export type OttPurpose = 'activate' | 'reset_password'

const TTL_SEC: Record<OttPurpose, number> = {
  activate: 48 * 60 * 60,
  reset_password: 24 * 60 * 60,
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function issueOneTimeToken(purpose: OttPurpose, userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url')
  const key = `ott:${purpose}:${hashToken(token)}`
  await redisCache.setex(key, TTL_SEC[purpose], userId)
  return token
}

export async function consumeOneTimeToken(
  purpose: OttPurpose,
  token: string,
): Promise<string | null> {
  const key = `ott:${purpose}:${hashToken(token)}`
  // GETDEL — атомарное чтение + удаление (Redis 6.2+)
  const userId = await redisCache.getdel(key)
  return userId
}
