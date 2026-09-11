import type { NextFunction, Request, Response, RequestHandler } from 'express'
import type { ZodTypeAny, infer as ZodInfer } from 'zod'

/// Validates and replaces req.body with the parsed result. Throws ZodError on
/// failure, which the error handler turns into a 400.
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) as ZodInfer<S>
    next()
  }
}

/// Wraps an async route handler so rejected promises reach the error handler.
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}
