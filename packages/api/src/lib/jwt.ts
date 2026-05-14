import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC } from '@qd/shared'
import { env } from './env.js'
import { redisCache } from './redis.js'

export interface AccessPayload {
  sub: string
  role: string
}

export interface RefreshPayload extends AccessPayload {
  typ: 'refresh'
  family: string // линия refresh-токенов (для отзыва всей цепи при reuse)
  jti: string // уникальный id текущего токена
}

export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SEC })
}

export function signRefresh(payload: Omit<RefreshPayload, 'typ'>): string {
  return jwt.sign({ ...payload, typ: 'refresh' } satisfies RefreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SEC,
  })
}

export function verifyRefresh(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload
  if (decoded.typ !== 'refresh') throw new Error('not_a_refresh_token')
  return decoded
}

// ─── Redis allowlist для RTR ───
// Ключи:
//   rt:active:{family} = jti       — текущий валидный jti в семействе
//   rt:user:{userId}   = SET<family> — все семейства пользователя (для logout-all)

const activeKey = (family: string) => `rt:active:${family}`
const userFamiliesKey = (userId: string) => `rt:user:${userId}`

export async function issueTokenPair(userId: string, role: string) {
  const family = crypto.randomUUID()
  const jti = crypto.randomUUID()

  await redisCache
    .multi()
    .setex(activeKey(family), REFRESH_TOKEN_TTL_SEC, jti)
    .sadd(userFamiliesKey(userId), family)
    .expire(userFamiliesKey(userId), REFRESH_TOKEN_TTL_SEC)
    .exec()

  const accessToken = signAccess({ sub: userId, role })
  const refreshToken = signRefresh({ sub: userId, role, family, jti })
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SEC }
}

/**
 * Refresh Token Rotation:
 * - если jti в Redis совпадает — ротируем (новый jti, тот же family)
 * - если не совпадает (reuse старого) — отзываем всё семейство
 */
export async function rotateRefresh(token: string) {
  const payload = verifyRefresh(token)
  const currentJti = await redisCache.get(activeKey(payload.family))

  if (currentJti !== payload.jti) {
    // Reuse detected — отзываем семейство целиком
    await redisCache.del(activeKey(payload.family))
    await redisCache.srem(userFamiliesKey(payload.sub), payload.family)
    throw new Error('refresh_reuse_detected')
  }

  const newJti = crypto.randomUUID()
  await redisCache.setex(activeKey(payload.family), REFRESH_TOKEN_TTL_SEC, newJti)

  const accessToken = signAccess({ sub: payload.sub, role: payload.role })
  const refreshToken = signRefresh({
    sub: payload.sub,
    role: payload.role,
    family: payload.family,
    jti: newJti,
  })
  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SEC }
}

export async function revokeFamily(family: string, userId: string) {
  await redisCache.del(activeKey(family))
  await redisCache.srem(userFamiliesKey(userId), family)
}

export async function revokeAllForUser(userId: string) {
  const families = await redisCache.smembers(userFamiliesKey(userId))
  if (families.length === 0) return
  await redisCache.del(...families.map(activeKey), userFamiliesKey(userId))
}
