import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { apiRouter } from './routes.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'

export function createApp() {
  const app = express()

  // Behind Vercel's edge/proxy, so honor X-Forwarded-For for req.ip (used by
  // per-IP rate limiting).
  app.set('trust proxy', true)

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  )
  app.use(express.json())

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
