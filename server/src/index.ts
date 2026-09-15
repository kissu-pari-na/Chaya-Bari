import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { dispatchReviewInvites } from './modules/reviews/review-invite.service.js'

// How often to check for orders that became eligible for a review invite.
const REVIEW_INVITE_INTERVAL_MS = 60 * 60 * 1000 // hourly

// On serverless platforms (Vercel/AWS Lambda) the function is invoked per
// request and frozen between requests, so binding a port and running interval
// timers is both wasteful (extra cold-start work) and ineffective. There we
// export the Express app as the request handler instead. On a persistent host
// we start a real HTTP server and the background scheduler.
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

const app = createApp()

if (!isServerless) {
  const server = app.listen(env.port, () => {
    logger.info('Server started', { port: env.port, env: env.nodeEnv })
  })

  // Day-after-delivery review invites: run shortly after boot, then hourly.
  // Each order is invited at most once, so re-running is harmless.
  // (On serverless, drive this from a scheduled Cron hitting an endpoint.)
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

// Vercel's @vercel/node runs the default export as the serverless handler; an
// Express app is a valid (req, res) handler.
export default app
