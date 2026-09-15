import dotenv from 'dotenv'

dotenv.config()

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Base URL of the web app for links in outgoing emails. Prefer APP_URL; if it
// is not set, fall back to the first non-localhost CORS origin (the deployed
// frontend must be allowed there for the app to work), so email links point at
// the live site instead of localhost even when APP_URL is forgotten.
const liveOrigin = corsOrigins.find((o) => !/localhost|127\.0\.0\.1/.test(o))
const appUrl = process.env.APP_URL || liveOrigin || 'http://localhost:5173'

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigins,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  appUrl,

  // Shared secret protecting the maintenance endpoint driven by Vercel Cron.
  // Leave unset to disable the endpoint (it then returns 503).
  cronSecret: process.env.CRON_SECRET ?? '',

  // SMTP for outgoing email. Leave unset to run the mailer in log-only mode.
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'ছায়া বাড়ি <no-reply@chayabari.example>',
  },

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
