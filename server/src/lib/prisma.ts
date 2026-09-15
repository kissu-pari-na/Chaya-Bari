import { PrismaClient } from '@prisma/client'
import { isProduction } from '../config/env.js'

// Reuse a single PrismaClient across hot reloads in dev AND across warm
// serverless invocations in production. Creating a new client (and opening a
// new pool) on every invocation is a common source of latency and connection
// exhaustion on platforms like Vercel, so we cache it on globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['query', 'warn', 'error'],
  })

globalForPrisma.prisma = prisma
