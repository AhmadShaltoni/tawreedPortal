import { notFound } from 'next/navigation'
import { getCategoryById, getCategoryTree } from '@/actions/categories'
import { EditCategoryForm } from './EditCategoryForm'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [category, categoryTree] = await Promise.all([
    getCategoryById(id),
    getCategoryTree(true),
  ])
  if (!category) notFound()

  return <EditCategoryForm category={category} categoryTree={categoryTree} />
}
