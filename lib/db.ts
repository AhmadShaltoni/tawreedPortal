// Prisma Client singleton for database access
// This ensures we don't create multiple instances during development

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

function hasRequiredDelegates(client: PrismaClient) {
  const prisma = client as unknown as {
    deliveryConfig?: { findFirst?: unknown }
    deliveryZone?: { findMany?: unknown }
    deliveryPromotion?: { findMany?: unknown }
    zakatConfig?: { findFirst?: unknown }
    zakatPayment?: { findMany?: unknown }
  }

  return (
    typeof prisma.deliveryConfig?.findFirst === 'function' &&
    typeof prisma.deliveryZone?.findMany === 'function' &&
    typeof prisma.deliveryPromotion?.findMany === 'function' &&
    typeof prisma.zakatConfig?.findFirst === 'function' &&
    typeof prisma.zakatPayment?.findMany === 'function'
  )
}

const cachedClient = globalForPrisma.prisma
const initialClient = cachedClient ?? createPrismaClient()

// In development with hot-reload, a stale Prisma singleton can survive schema changes.
// Recreate the client if new delegates are missing to prevent runtime "undefined" errors.
export const db = hasRequiredDelegates(initialClient) ? initialClient : createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
