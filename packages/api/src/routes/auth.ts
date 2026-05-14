import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { loginSchema, telegramAuthSchema, LOGIN_RATE_LIMIT } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { redisCache } from '../lib/redis.js'
import { env } from '../lib/env.js'
import { verifyTelegramAuth } from '../lib/telegram-auth.js'
import { issueTokenPair, revokeAllForUser, revokeFamily, rotateRefresh, verifyRefresh } from '../lib/jwt.js'
import { consumeOneTimeToken, issueOneTimeToken } from '../lib/one-time-token.js'
import { buildPasswordResetEmail, getWebBase, sendEmail } from '../lib/email.js'
import { logger } from '../lib/logger.js'
import { ApiError, forbidden, tooMany, unauthorized } from '../lib/errors.js'

const refreshBodySchema = z.object({ refreshToken: z.string().min(10) })

const activateSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128),
})

const forgotPasswordSchema = z.object({ email: z.string().email().toLowerCase() })

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/telegram — UC-01
  app.post('/telegram', async (req, reply) => {
    const data = telegramAuthSchema.parse(req.body)
    if (!env.TELEGRAM_BOT_TOKEN) {
      return reply.code(503).send({ code: 'telegram_not_configured' })
    }
    if (!verifyTelegramAuth(data, env.TELEGRAM_BOT_TOKEN)) {
      throw unauthorized('invalid_telegram_data')
    }

    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(data.id) } })
    if (!user) throw forbidden('not_registered')
    if (!user.isActive) throw forbidden('account_disabled')

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    return reply.send(await issueTokenPair(user.id, user.role))
  })

  // POST /auth/login — UC-02
  app.post('/login', async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body)

    const banKey = `login:ban:${req.ip}`
    if (await redisCache.get(banKey)) {
      throw tooMany(`Слишком много попыток. Попробуйте через ${LOGIN_RATE_LIMIT.banSec / 60} минут.`)
    }

    const user = await prisma.user.findUnique({ where: { email } })
    const ok = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false

    if (!user || !ok) {
      const attemptsKey = `login:attempts:${req.ip}`
      const attempts = await redisCache.incr(attemptsKey)
      if (attempts === 1) await redisCache.expire(attemptsKey, LOGIN_RATE_LIMIT.windowSec)
      if (attempts >= LOGIN_RATE_LIMIT.maxAttempts) {
        await redisCache.setex(banKey, LOGIN_RATE_LIMIT.banSec, '1')
      }
      throw unauthorized('invalid_credentials')
    }

    if (!user.isActive) throw forbidden('account_disabled')

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    return reply.send(await issueTokenPair(user.id, user.role))
  })

  // POST /auth/refresh — RTR
  app.post('/refresh', async (req, reply) => {
    const { refreshToken } = refreshBodySchema.parse(req.body)
    try {
      const pair = await rotateRefresh(refreshToken)
      return reply.send(pair)
    } catch (err) {
      const code = (err as Error).message
      if (code === 'refresh_reuse_detected') {
        throw unauthorized('refresh_reuse_detected')
      }
      throw unauthorized()
    }
  })

  // POST /auth/logout
  app.post('/logout', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = refreshBodySchema.safeParse(req.body)
    if (parsed.success) {
      try {
        const payload = verifyRefresh(parsed.data.refreshToken)
        await revokeFamily(payload.family, payload.sub)
      } catch {
        /* истёкший/невалидный — ничего страшного, всё равно logout */
      }
    }
    return reply.send({ ok: true })
  })

  // POST /auth/logout-all
  app.post('/logout-all', { preHandler: [app.authenticate] }, async (req, reply) => {
    await revokeAllForUser(req.currentUser!.id)
    return reply.send({ ok: true })
  })

  // POST /auth/forgot-password — всегда 200 (защита от enumeration)
  app.post('/forgot-password', async (req, reply) => {
    const { email } = forgotPasswordSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })

    if (user && user.isActive) {
      const token = await issueOneTimeToken('reset_password', user.id)
      const resetUrl = `${getWebBase()}/auth/reset-password?token=${token}`
      sendEmail({ ...buildPasswordResetEmail(resetUrl), to: email }).catch((err) =>
        logger.error({ err, email }, 'reset email send failed'),
      )
    }

    return reply.send({ ok: true })
  })

  // POST /auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const { token, password } = resetPasswordSchema.parse(req.body)

    const userId = await consumeOneTimeToken('reset_password', token)
    if (!userId) throw new ApiError(400, 'invalid_or_expired_token')

    const hash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
    await revokeAllForUser(userId) // выйти со всех устройств

    return reply.send({ ok: true })
  })

  // POST /auth/activate — установка пароля после одобрения заявки
  app.post('/activate', async (req, reply) => {
    const { token, password } = activateSchema.parse(req.body)

    const userId = await consumeOneTimeToken('activate', token)
    if (!userId) throw new ApiError(400, 'invalid_or_expired_token')

    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, isActive: true, lastLoginAt: new Date() },
    })

    return reply.send(await issueTokenPair(user.id, user.role))
  })
}

// ─── Helpers (используется в admin-bot после approve) ───

export async function buildActivationLink(userId: string): Promise<string> {
  const token = await issueOneTimeToken('activate', userId)
  return `${getWebBase()}/auth/activate?token=${token}`
}
