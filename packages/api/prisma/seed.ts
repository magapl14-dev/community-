import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@quantum-dag.ru'
  const passwordHash = await bcrypt.hash('Admin12345!', 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Администратор',
      role: 'admin',
      isActive: true,
      member: {
        create: {
          joinedClubAt: new Date(),
          city: 'Махачкала',
        },
      },
    },
  })

  await prisma.membership.upsert({
    where: { paymentId: `seed-${admin.id}` },
    update: {},
    create: {
      userId: admin.id,
      plan: 'base',
      amount: 3_000_000,
      status: 'active',
      startsAt: new Date(),
      expiresAt: addDays(new Date(), 365),
      paymentId: `seed-${admin.id}`,
      paymentMethod: 'manual',
    },
  })

  console.log('✓ Seed completed. Admin:', adminEmail, '/ Admin12345!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
