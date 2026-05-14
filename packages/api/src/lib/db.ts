import { PrismaClient } from '@prisma/client'
import { isDev } from './env.js'

export const prisma = new PrismaClient({
  log: isDev ? ['warn', 'error'] : ['error'],
})

export async function disconnectDb() {
  await prisma.$disconnect()
}
