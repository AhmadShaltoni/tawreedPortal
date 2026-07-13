import { Prisma, PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { normalizeSearchText, expandQueryWord, composeProductSearchText } from '@/lib/search-normalize'

type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Recomputes Product.searchText from the product's names, brand, variant sizes,
 * variant options, and admin keywords. Call after any mutation that touches those.
 */
export async function rebuildProductSearchText(client: DbClient, productId: string): Promise<void> {
  const product = await client.product.findUnique({
    where: { id: productId },
    select: {
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
  if (!product) return

  await client.product.update({
    where: { id: productId },
    data: { searchText: composeProductSearchText(product) },
  })
}

/** Rebuilds searchText for every product of a brand (after a brand rename). */
export async function rebuildBrandProductsSearchText(brandId: string): Promise<void> {
  const products = await db.product.findMany({ where: { brandId }, select: { id: true } })
  for (const p of products) {
    await rebuildProductSearchText(db, p.id)
  }
}

// Below this similarity score a fuzzy word match is considered noise
const FUZZY_THRESHOLD = 0.4
const MAX_SEARCH_RESULTS = 300

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => '\\' + c)
}

/**
 * Runs an Arabic-aware fuzzy search and returns matching product IDs,
 * best matches first. Every query word must match either as a substring
 * (after normalization, including synonyms) or by trigram similarity
 * (typo tolerance, e.g. شوكلاته → شوكولاته).
 *
 * Callers combine the returned IDs with their own Prisma filters.
 */
export async function searchProductIds(rawQuery: string): Promise<string[]> {
  const normalized = normalizeSearchText(rawQuery)
  const words = normalized.split(' ').filter(Boolean)
  if (words.length === 0) return []

  const wordConditions = words.map(word => {
    const alternates = expandQueryWord(word)
    const likes = alternates.map(
      alt => Prisma.sql`"searchText" LIKE ${'%' + escapeLike(alt) + '%'}`
    )
    // Trigram similarity needs enough characters to be meaningful
    const fuzzy = word.length >= 4
      ? Prisma.sql` OR word_similarity(${word}, "searchText") >= ${FUZZY_THRESHOLD}`
      : Prisma.empty
    return Prisma.sql`(${Prisma.join(likes, ' OR ')}${fuzzy})`
  })

  // Rank: exact (substring) word hits first, then overall fuzzy closeness
  const exactHits = Prisma.join(
    words.map(word => {
      const likes = expandQueryWord(word).map(
        alt => Prisma.sql`"searchText" LIKE ${'%' + escapeLike(alt) + '%'}`
      )
      return Prisma.sql`(CASE WHEN ${Prisma.join(likes, ' OR ')} THEN 1 ELSE 0 END)`
    }),
    ' + '
  )
  const fuzzyScore = Prisma.join(
    words.map(word => Prisma.sql`word_similarity(${word}, "searchText")`),
    ' + '
  )

  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM "Product"
    WHERE "isActive" = true
      AND ${Prisma.join(wordConditions, ' AND ')}
    ORDER BY ${exactHits} DESC, ${fuzzyScore} DESC, "sortOrder" ASC
    LIMIT ${MAX_SEARCH_RESULTS}
  `)

  return rows.map(r => r.id)
}

/**
 * Applies extra Prisma filters to ranked search IDs and paginates while
 * preserving rank order. Returns the IDs for the requested page plus the total.
 */
export async function paginateSearchIds(
  rankedIds: string[],
  where: Record<string, unknown>,
  skip: number,
  take: number,
): Promise<{ pageIds: string[]; total: number }> {
  if (rankedIds.length === 0) return { pageIds: [], total: 0 }

  const matching = await db.product.findMany({
    where: { ...where, id: { in: rankedIds } },
    select: { id: true },
  })
  const matchSet = new Set(matching.map(m => m.id))
  const ordered = rankedIds.filter(id => matchSet.has(id))

  return { pageIds: ordered.slice(skip, skip + take), total: ordered.length }
}

/** Reorders fetched rows to match the ranked page IDs. */
export function sortByIdOrder<T extends { id: string }>(rows: T[], orderedIds: string[]): T[] {
  const position = new Map(orderedIds.map((id, i) => [id, i]))
  return [...rows].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
}
