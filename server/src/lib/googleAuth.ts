import { createPublicKey, type JsonWebKey, type KeyObject } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { HttpError } from '../utils/httpError.js'
import { logger } from './logger.js'

// Google publishes the public keys that sign its ID tokens as a JWK set. We
// verify the token's signature against these rather than calling Google, so no
// client secret or network round-trip per login is needed (the keys are cached).
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS: [string, ...string[]] = ['https://accounts.google.com', 'accounts.google.com']

interface GoogleJwk {
  kid: string
  kty: string
  alg: string
  use: string
  n: string
  e: string
}

// Verified profile fields we consume from a Google ID token.
export interface GoogleProfile {
  sub: string
  email: string
  emailVerified: boolean
  name: string
}

// Cache the parsed signing keys until Google's Cache-Control says they may have
// rotated (defaults to an hour if the header is missing).
let keyCache: { keys: Map<string, KeyObject>; expiresAt: number } | null = null

async function getSigningKeys(): Promise<Map<string, KeyObject>> {
  if (keyCache && keyCache.expiresAt > Date.now()) return keyCache.keys

  const res = await fetch(CERTS_URL)
  if (!res.ok) throw new Error(`Failed to fetch Google signing keys (${res.status})`)
  const body = (await res.json()) as { keys: GoogleJwk[] }

  const keys = new Map<string, KeyObject>()
  for (const jwk of body.keys) {
    // Node can import a JWK directly into a public KeyObject that jsonwebtoken
    // accepts for verification.
    keys.set(jwk.kid, createPublicKey({ key: jwk as unknown as JsonWebKey, format: 'jwk' }))
  }

  const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')
  const ttlMs = (maxAge ? Number(maxAge[1]) : 3600) * 1000
  keyCache = { keys, expiresAt: Date.now() + ttlMs }
  return keys
}

/// Verify a Google Identity Services ID token and return the profile it asserts.
/// Throws an HttpError(401) if the token is missing, malformed, or fails
/// signature / audience / issuer / expiry checks.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.google.clientId) {
    throw HttpError.badRequest('Google sign-in is not enabled')
  }

  const decoded = jwt.decode(idToken, { complete: true })
  const kid = decoded && typeof decoded !== 'string' ? decoded.header.kid : undefined
  if (!kid) throw HttpError.unauthorized('Invalid Google token')

  let key: KeyObject | undefined
  try {
    key = (await getSigningKeys()).get(kid)
  } catch (err) {
    logger.error('Google signing key fetch failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    throw new HttpError(503, 'Could not verify Google sign-in right now. Please try again.')
  }
  if (!key) throw HttpError.unauthorized('Invalid Google token')

  let payload: jwt.JwtPayload
  try {
    const verified = jwt.verify(idToken, key, {
      algorithms: ['RS256'],
      audience: env.google.clientId,
      issuer: ISSUERS,
    })
    if (typeof verified === 'string') throw new Error('Unexpected token payload')
    payload = verified
  } catch {
    throw HttpError.unauthorized('Invalid or expired Google token')
  }

  const email = typeof payload.email === 'string' ? payload.email : ''
  if (!payload.sub || !email) throw HttpError.unauthorized('Google token is missing account details')

  return {
    sub: String(payload.sub),
    email,
    // Google sends email_verified as a boolean or the string "true".
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    name: typeof payload.name === 'string' ? payload.name : '',
  }
}
