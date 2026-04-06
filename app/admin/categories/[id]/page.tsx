import { notFound } from 'next/navigation'
import { getCategoryById } from '@/actions/categories'
import { EditCategoryForm } from './EditCategoryForm'

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const category = await getCategoryById(id)
  if (!category) notFound()

  return <EditCategoryForm category={category} />
}
