import jwt from 'jsonwebtoken'
import type { Role } from '@prisma/client'
import { env } from '../config/env.js'

export interface AuthTokenPayload {
  sub: string
  role: Role
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret)
  if (typeof decoded === 'string' || !decoded.sub || !('role' in decoded)) {
    throw new Error('Invalid token payload')
  }
  return { sub: String(decoded.sub), role: (decoded as jwt.JwtPayload).role as Role }
}
