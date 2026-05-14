import type { Member, Membership, User } from '@prisma/client'

type CurrentUser = User & {
  member: Member | null
  memberships: Membership[]
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: CurrentUser
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string }
    user: { sub: string; role: string }
  }
}
