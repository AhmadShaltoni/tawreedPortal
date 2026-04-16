import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiResponse, corsOptions } from '@/lib/api-auth'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/categories?parentId=xxx&tree=true
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parentIdParam = searchParams.get('parentId')
  const tree = searchParams.get('tree') === 'true'

  // Full tree mode - return recursive hierarchy
  if (tree) {
    const allCategories = await db.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        image: true,
        sortOrder: true,
        parentId: true,
        depth: true,
        isActive: true,
        _count: { select: { products: { where: { isActive: true } }, children: { where: { isActive: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Build tree
    type TreeNode = { id: string; name: string; nameEn: string | null; slug: string; sortOrder: number; parentId: string | null; depth: number; isActive: boolean; children: TreeNode[]; hasChildren: boolean; productsCount: number; childrenCount: number; image: { url: string; alt: string } | null }
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    for (const cat of allCategories) {
      map.set(cat.id, {
        id: cat.id,
        name: cat.name,
        nameEn: cat.nameEn,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
        parentId: cat.parentId,
        depth: cat.depth,
        isActive: cat.isActive,
        children: [],
        hasChildren: cat._count.children > 0,
        productsCount: cat._count.products,
        childrenCount: cat._count.children,
        image: cat.image ? { url: cat.image, alt: cat.name } : null,
      })
    }

    for (const cat of allCategories) {
      const node = map.get(cat.id)!
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return apiResponse({ categories: roots })
  }

  // Flat mode - return categories at a specific level
  const where: Record<string, unknown> = { isActive: true }
  if (parentIdParam) {
    where.parentId = parentIdParam
  } else {
    where.parentId = null // root categories by default
  }

  const categories = await db.category.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      image: true,
      sortOrder: true,
      parentId: true,
      depth: true,
      isActive: true,
      _count: { select: { products: { where: { isActive: true } }, children: { where: { isActive: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  // Transform response
  const categoriesWithMeta = categories.map(cat => {
    const { image, _count, ...rest } = cat
    return {
      ...rest,
      image: image ? { url: image, alt: cat.name } : null,
      hasChildren: _count.children > 0,
      productsCount: _count.products,
      childrenCount: _count.children,
    }
  })

  // If parentId provided, also return breadcrumb with full metadata
  let breadcrumb: { id: string; name: string; nameEn: string | null; slug: string; image: { url: string; alt: string } | null; depth: number; hasChildren: boolean; childrenCount: number; productsCount: number }[] = []
  if (parentIdParam) {
    const parent = await db.category.findUnique({
      where: { id: parentIdParam },
      select: { path: true },
    })
    if (parent?.path) {
      const ancestorIds = parent.path.split('/').filter(Boolean)
      const ancestors = await db.category.findMany({
        where: { id: { in: ancestorIds } },
        select: { 
          id: true, 
          name: true, 
          nameEn: true, 
          slug: true,
          image: true,
          depth: true,
          _count: { select: { products: { where: { isActive: true } }, children: { where: { isActive: true } } } }
        },
      })
      breadcrumb = ancestorIds
        .map(id => {
          const ancestor = ancestors.find(a => a.id === id)
          if (!ancestor) return null
          return {
            id: ancestor.id,
            name: ancestor.name,
            nameEn: ancestor.nameEn,
            slug: ancestor.slug,
            image: ancestor.image ? { url: ancestor.image, alt: ancestor.name } : null,
            depth: ancestor.depth,
            hasChildren: ancestor._count.children > 0,
            childrenCount: ancestor._count.children,
            productsCount: ancestor._count.products,
          }
        })
        .filter(Boolean) as typeof breadcrumb
    }
  }

  return apiResponse({ categories: categoriesWithMeta, breadcrumb })
}
