/**
 * Arabic-aware text normalization for search.
 *
 * The same normalization is applied to indexed product text (Product.searchText)
 * and to user queries, so spelling variations match regardless of how the
 * admin or the customer typed them:
 *   - Hamza variants:   أحمد / إحمد / آحمد / احمد  → احمد
 *   - Taa marbuta:      مدرسة / مدرسه              → مدرسه
 *   - Alef maqsura:     هدى / هدي                   → هدي
 *   - Diacritics:       أَحمد → احمد
 *   - Tatweel:          شـوكـولاته → شوكولاته
 *   - Punctuation:      ابو-احمد → ابو احمد
 *   - Extra spaces:     collapsed to single spaces
 *   - Arabic digits:    ٢ كيلو → 2 كيلو
 */

// Tashkeel (U+064B–U+0652), superscript alef (U+0670), tatweel (U+0640)
const DIACRITICS_AND_TATWEEL = /[\u064B-\u0652\u0670\u0640]/g

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(DIACRITICS_AND_TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * Dialect/synonym groups (stored in normalized form).
 * A query word found in a group is expanded to match any word in that group.
 * Product-specific synonyms belong in Product.keywords, edited by the admin;
 * this list is only for universal, unambiguous equivalences.
 */
const SYNONYM_GROUPS: string[][] = [
  ['بندوره', 'طماطم'],
  ['بطاطا', 'بطاطس'],
]

const SYNONYM_INDEX = new Map<string, string[]>()
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM_INDEX.set(word, group)
}

/** Returns the word plus any synonyms, all normalized. */
export function expandQueryWord(word: string): string[] {
  const group = SYNONYM_INDEX.get(word)
  return group ? Array.from(new Set([word, ...group])) : [word]
}

/** Composes the normalized searchText for a product from all its searchable parts. */
export function buildProductSearchText(parts: Array<string | null | undefined>): string {
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}

/** The product fields searchText is derived from (matches the Prisma select in search-index.ts). */
export interface ProductSearchSource {
  name: string
  nameEn: string | null
  keywords: string | null
  brand: { name: string; nameEn: string | null } | null
  variants: Array<{
    size: string
    sizeEn: string | null
    options: Array<{ name: string; nameEn: string | null }>
  }>
}

export function composeProductSearchText(p: ProductSearchSource): string {
  return buildProductSearchText([
    p.name,
    p.nameEn,
    p.brand?.name,
    p.brand?.nameEn,
    ...p.variants.flatMap(v => [
      v.size,
      v.sizeEn,
      ...v.options.flatMap(o => [o.name, o.nameEn]),
    ]),
    p.keywords,
  ])
}
