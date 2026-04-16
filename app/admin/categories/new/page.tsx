import { NewCategoryForm } from './NewCategoryForm'
import { getCategoryTree } from '@/actions/categories'

export default async function NewCategoryPage() {
  const categoryTree = await getCategoryTree(true)

  return <NewCategoryForm categoryTree={categoryTree} />
}
