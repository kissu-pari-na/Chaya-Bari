import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { verifyAuthToken } from '../utils/jwt.js'
import { HttpError } from '../utils/httpError.js'

export interface AuthUser {
  id: string
  role: Role
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/// Requires a valid Bearer token; attaches req.user.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw HttpError.unauthorized('Missing or malformed Authorization header')
  }
  const token = header.slice('Bearer '.length).trim()
  try {
    const payload = verifyAuthToken(token)
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    throw HttpError.unauthorized('Invalid or expired token')
  }
}

/// Requires the authenticated user to hold one of the given roles.
/// Must run after `authenticate`.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw HttpError.unauthorized()
    if (!roles.includes(req.user.role)) {
      throw HttpError.forbidden('You do not have access to this resource')
    }
    next()
  }
}
