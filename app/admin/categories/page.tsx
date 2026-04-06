import { getCategories } from '@/actions/categories'
import { CategoryListClient } from './CategoryListClient'

export default async function AdminCategoriesPage() {
  const categories = await getCategories(true)
  return <CategoryListClient categories={categories} />
}
