import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'

async function main() {
  const app = createApp()

  const server = app.listen(env.port, () => {
    logger.info('Server started', { port: env.port, env: env.nodeEnv })
  })

  const shutdown = async (signal: string) => {
    logger.info('Shutting down', { signal })
    server.close()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  logger.error('Fatal startup error', { message: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})
