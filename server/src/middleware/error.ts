import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { HttpError } from '../utils/httpError.js'
import { logger } from '../lib/logger.js'
import { isProduction } from '../config/env.js'

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(HttpError.notFound('Route not found'))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details, code: err.code })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with these values already exists' })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' })
    }
  }

  logger.error('Unhandled error', { message: err instanceof Error ? err.message : String(err) })
  return res.status(500).json({
    error: 'Internal server error',
    ...(isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  })
}
