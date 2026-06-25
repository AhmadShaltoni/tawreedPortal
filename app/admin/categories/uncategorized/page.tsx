import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getCategoryTree } from '@/actions/categories'
import { UncategorizedProductManager, type CategoryOption } from '../components/UncategorizedProductManager'

export const dynamic = 'force-dynamic'

const UNCATEGORIZED_SLUG = 'other'

type TreeNode = {
  id: string
  name: string
  slug: string
  children: TreeNode[]
}

// Flatten the category tree into ordered options with depth, excluding the catch-all "Other" category
function flattenCategories(nodes: TreeNode[], depth = 0, acc: CategoryOption[] = []): CategoryOption[] {
  for (const node of nodes) {
    if (node.slug !== UNCATEGORIZED_SLUG) {
      acc.push({ id: node.id, name: node.name, depth })
    }
    if (node.children?.length) {
      flattenCategories(node.children, depth + 1, acc)
    }
  }
  return acc
}

export default async function UncategorizedProductsPage() {
  const tree = (await getCategoryTree(true)) as unknown as TreeNode[]
  const categories = flattenCategories(tree)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/categories" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className="w-5 h-5 rotate-180" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">منتجات بدون تصنيف</h1>
          <p className="text-sm text-gray-600">حدّد المنتجات وانقلها إلى التصنيف المناسب بسهولة</p>
        </div>
      </div>

      <UncategorizedProductManager categories={categories} />
    </div>
  )
}
