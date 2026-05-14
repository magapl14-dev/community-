import { buildApp } from './app.js'
import { env } from './lib/env.js'
import { logger } from './lib/logger.js'
import { disconnectDb } from './lib/db.js'
import { startWorkers } from './jobs/workers.js'
import { registerCronSchedules, startCronWorker } from './jobs/schedulers.js'
import { startAdminBot, stopAdminBot } from './bot/admin-bot.js'

async function main() {
  const app = await buildApp()

  const workers = [...startWorkers(), startCronWorker()]
  await registerCronSchedules()

  void startAdminBot()

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down')
    await app.close()
    await stopAdminBot()
    await Promise.all(workers.map((w) => w.close()))
    await disconnectDb()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  await app.listen({ port: env.PORT, host: env.HOST })
  logger.info({ port: env.PORT }, `API ready at http://${env.HOST}:${env.PORT}`)
}

main().catch((err) => {
  logger.fatal({ err }, 'fatal startup error')
  process.exit(1)
})
