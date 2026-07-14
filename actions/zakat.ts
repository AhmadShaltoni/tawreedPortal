'use server'

import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ActionResponse, ZakatSummary } from '@/types'

// Get (or lazily create) the singleton zakat configuration.
async function getOrCreateZakatConfig() {
  const existing = await db.zakatConfig.findFirst()
  if (existing) return existing
  return db.zakatConfig.create({ data: {} })
}

// Build the where-clause that selects order items sold (DELIVERED) since a
// given reset point. Uses actualDelivery, falling back to updatedAt for older
// delivered orders that predate the actualDelivery field being populated.
function soldSinceWhere(since: Date) {
  return {
    isReward: false,
    order: {
      status: 'DELIVERED' as const,
      OR: [
        { actualDelivery: { gte: since } },
        { actualDelivery: null, updatedAt: { gte: since } },
      ],
    },
  }
}

// Summary of the zakat counter accumulated since the last reset.
export async function getZakatSummary(): Promise<ZakatSummary> {
  const config = await getOrCreateZakatConfig()

  const result = await db.orderItem.aggregate({
    _sum: { quantity: true },
    where: soldSinceWhere(config.lastResetAt),
  })

  const itemsSold = result._sum.quantity ?? 0
  const zakatAmount = (itemsSold * config.piastresPerItem) / 100

  return {
    itemsSold,
    zakatAmount,
    piastresPerItem: config.piastresPerItem,
    lastResetAt: config.lastResetAt.toISOString(),
  }
}

// Mark the accumulated zakat as paid and reset the counter (moves lastResetAt
// to now so accumulation starts over). Records the payment in history.
export async function resetZakatCounter(note?: string): Promise<ActionResponse> {
  const { authorized, error } = await requireRole(['ADMIN'])
  if (!authorized) return { success: false, error: error ?? 'Not authorized' }

  const config = await getOrCreateZakatConfig()

  const result = await db.orderItem.aggregate({
    _sum: { quantity: true },
    where: soldSinceWhere(config.lastResetAt),
  })
  const itemsSold = result._sum.quantity ?? 0
  const amount = (itemsSold * config.piastresPerItem) / 100
  const now = new Date()

  await db.$transaction([
    db.zakatPayment.create({
      data: {
        amount,
        itemsCount: itemsSold,
        periodFrom: config.lastResetAt,
        periodTo: now,
        note: note?.trim() || null,
      },
    }),
    db.zakatConfig.update({
      where: { id: config.id },
      data: { lastResetAt: now },
    }),
  ])

  revalidatePath('/admin')
  revalidatePath('/admin/revenue')
  return { success: true }
}

// Recent zakat payment history.
export async function getZakatPayments(limit = 20) {
  const { authorized } = await requireRole(['ADMIN'])
  if (!authorized) return []

  return db.zakatPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
