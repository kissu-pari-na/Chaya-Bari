import dotenv from 'dotenv'

dotenv.config()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  // bKash Tokenized Checkout (PGW). Leave unset to run in sandbox/mock mode.
  bkash: {
    baseUrl: process.env.BKASH_BASE_URL ?? '',
    appKey: process.env.BKASH_APP_KEY ?? '',
    appSecret: process.env.BKASH_APP_SECRET ?? '',
    username: process.env.BKASH_USERNAME ?? '',
    password: process.env.BKASH_PASSWORD ?? '',
  },
}

/// True only when every bKash credential is present; otherwise the app falls
/// back to a self-contained sandbox that simulates the gateway end to end.
export const isBkashLive =
  !!env.bkash.baseUrl && !!env.bkash.appKey && !!env.bkash.appSecret && !!env.bkash.username && !!env.bkash.password

export const isProduction = env.nodeEnv === 'production'
