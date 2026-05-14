import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UserRole } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { forbidden, unauthorized } from '../lib/errors.js'

export async function authenticate(req: FastifyRequest, _reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    throw unauthorized()
  }

  const sub = (req.user as { sub?: string } | undefined)?.sub
  if (!sub) throw unauthorized()

  const user = await prisma.user.findUnique({
    where: { id: sub },
    include: {
      member: true,
      memberships: {
        where: { status: 'active' },
        orderBy: { expiresAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!user) throw unauthorized()
  if (!user.isActive) throw forbidden('account_disabled')

  req.currentUser = user
}

export async function requireActiveMembership(req: FastifyRequest, _reply: FastifyReply) {
  const active = req.currentUser?.memberships[0]
  if (!active || active.expiresAt.getTime() < Date.now()) {
    throw forbidden('membership_expired', 'Членство истекло')
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    if (!req.currentUser || !roles.includes(req.currentUser.role)) {
      throw forbidden('forbidden')
    }
  }
}
