import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { dispatchReviewInvites } from './modules/reviews/review-invite.service.js'

// How often to check for orders that became eligible for a review invite.
const REVIEW_INVITE_INTERVAL_MS = 60 * 60 * 1000 // hourly

async function main() {
  const app = createApp()

  const server = app.listen(env.port, () => {
    logger.info('Server started', { port: env.port, env: env.nodeEnv })
  })

  // Day-after-delivery review invites: run shortly after boot, then hourly.
  // Each order is invited at most once, so re-running is harmless.
  const runInvites = () => void dispatchReviewInvites().catch(() => undefined)
  setTimeout(runInvites, 10_000)
  const inviteTimer = setInterval(runInvites, REVIEW_INVITE_INTERVAL_MS)

  const shutdown = async (signal: string) => {
    logger.info('Shutting down', { signal })
    clearInterval(inviteTimer)
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
