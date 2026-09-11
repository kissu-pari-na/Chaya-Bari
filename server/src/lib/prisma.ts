import { PrismaClient } from '@prisma/client'
import { isProduction } from '../config/env.js'

// Reuse a single PrismaClient across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['query', 'warn', 'error'],
  })

if (!isProduction) {
  globalForPrisma.prisma = prisma
}
