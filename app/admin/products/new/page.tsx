import { getCategories } from '@/actions/categories'
import { NewProductForm } from './NewProductForm'

export default async function NewProductPage() {
  const categories = await getCategories()
  return <NewProductForm categories={categories} />
}
