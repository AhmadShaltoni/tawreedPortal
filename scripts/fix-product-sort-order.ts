/**
 * Fix product sortOrder values.
 * All existing products have sortOrder: 0 (default).
 * This script assigns unique sequential sortOrder values based on createdAt.
 * 
 * Run: npx tsx scripts/fix-product-sort-order.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, sortOrder: true },
  })

  console.log(`Found ${products.length} products`)

  // Check if they all have the same sortOrder (likely all 0)
  const allSame = products.every(p => p.sortOrder === products[0]?.sortOrder)
  if (!allSame) {
    console.log('Products already have different sortOrder values. Skipping.')
    return
  }

  console.log(`All products have sortOrder=${products[0]?.sortOrder}. Assigning sequential values...`)

  for (let i = 0; i < products.length; i++) {
    await prisma.product.update({
      where: { id: products[i].id },
      data: { sortOrder: i },
    })
  }

  console.log(`Done! Assigned sortOrder 0-${products.length - 1} to all products.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
