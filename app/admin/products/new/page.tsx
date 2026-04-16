import { getCategoryTree } from '@/actions/categories'
import { NewProductForm } from './NewProductForm'

export default async function NewProductPage() {
  const categoryTree = await getCategoryTree()
  return <NewProductForm categoryTree={categoryTree} />
}
