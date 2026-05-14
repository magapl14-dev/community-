import type { FastifyInstance } from 'fastify'
import { membersQuerySchema, pushTokenSchema, updateMemberSchema } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { revokeAllForUser } from '../lib/jwt.js'
import { stripHtml } from '../lib/sanitize.js'
import { notFound } from '../lib/errors.js'

export async function membersRoutes(app: FastifyInstance) {
  // GET /members — UC: каталог участников (доступ: active membership)
  app.get(
    '/',
    { preHandler: [app.authenticate, app.requireActiveMembership] },
    async (req) => {
      const { page, limit, search, industry } = membersQuerySchema.parse(req.query)

      const where = {
        isPublic: true,
        ...(industry && { industry }),
        ...(search && {
          OR: [
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
            { company: { contains: search, mode: 'insensitive' as const } },
            { bio: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      }

      const [items, total] = await Promise.all([
        prisma.member.findMany({
          where,
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.member.count({ where }),
      ])

      return { items, page, limit, total }
    },
  )

  // GET /members/me
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    return prisma.member.findUnique({
      where: { userId: req.currentUser!.id },
      include: { user: true },
    })
  })

  // PATCH /members/me
  app.patch('/me', { preHandler: [app.authenticate] }, async (req) => {
    const input = updateMemberSchema.parse(req.body)
    return prisma.member.update({
      where: { userId: req.currentUser!.id },
      data: {
        ...input,
        bio: stripHtml(input.bio),
        lookingFor: stripHtml(input.lookingFor),
        canHelpWith: stripHtml(input.canHelpWith),
      },
    })
  })

  // DELETE /members/me — самоудаление аккаунта (152-ФЗ).
  // Анонимизируем User (для целостности memberships / registrations / audit),
  // удаляем Member-профиль (PII) и все push-токены, отзываем все сессии.
  app.delete('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.currentUser!.id

    await prisma.$transaction(async (tx) => {
      await tx.member.deleteMany({ where: { userId } })
      await tx.pushToken.deleteMany({ where: { userId } })
      await tx.user.update({
        where: { id: userId },
        data: {
          email: null,
          telegramId: null,
          passwordHash: null,
          name: 'Удалённый пользователь',
          avatarUrl: null,
          isActive: false,
          blockReason: 'self_deleted',
        },
      })
    })

    await revokeAllForUser(userId)
    return reply.send({ ok: true })
  })

  // POST /members/me/push-token — регистрация/обновление токена устройства
  app.post('/me/push-token', { preHandler: [app.authenticate] }, async (req) => {
    const input = pushTokenSchema.parse(req.body)
    const userId = req.currentUser!.id

    // Upsert по unique token: если токен уже привязан к другому юзеру — перепривязываем
    return prisma.pushToken.upsert({
      where: { token: input.token },
      create: { userId, ...input, isActive: true },
      update: { userId, platform: input.platform, appVersion: input.appVersion, isActive: true },
    })
  })

  // DELETE /members/me/push-token — отвязать токен (logout с устройства)
  app.delete<{ Body: { token: string } }>(
    '/me/push-token',
    { preHandler: [app.authenticate] },
    async (req) => {
      await prisma.pushToken
        .updateMany({
          where: { token: req.body.token, userId: req.currentUser!.id },
          data: { isActive: false },
        })
        .catch(() => {})
      return { ok: true }
    },
  )

  // GET /members/:id
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [app.authenticate, app.requireActiveMembership] },
    async (req) => {
      const member = await prisma.member.findUnique({
        where: { id: req.params.id },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      })
      if (!member || !member.isPublic) throw notFound()
      return member
    },
  )
}
