/**
 * Backfills Product.searchText for all existing products.
 * Run once after the add_product_search_text migration:
 *   npx tsx scripts/backfill-search-text.ts
 */

import { PrismaClient } from '@prisma/client'
import { composeProductSearchText } from '../lib/search-normalize'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      nameEn: true,
      keywords: true,
      brand: { select: { name: true, nameEn: true } },
      variants: {
        select: {
          size: true,
          sizeEn: true,
          options: { select: { name: true, nameEn: true } },
        },
      },
    },
  })

  console.log(`Rebuilding searchText for ${products.length} products...`)

  let done = 0
  for (const p of products) {
    const searchText = composeProductSearchText(p)
    await prisma.product.update({ where: { id: p.id }, data: { searchText } })
    done++
    if (done % 50 === 0) console.log(`  ${done}/${products.length}`)
  }

  console.log(`Done: ${done} products updated.`)

  const sample = await prisma.product.findFirst({
    where: { searchText: { not: '' } },
    select: { name: true, searchText: true },
  })
  if (sample) console.log(`Sample: "${sample.name}" → "${sample.searchText}"`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
