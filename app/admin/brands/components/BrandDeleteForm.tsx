'use client'

import { Trash2 } from 'lucide-react'
import { deleteBrand } from '@/actions/brands'
import { useState } from 'react'

interface Props {
  brandId: string
}

export function BrandDeleteForm({ brandId }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('هل أنت متأكد من حذف هذه الماركة؟')) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteBrand(brandId)
      if (!result.success) {
        alert(result.error || 'فشل الحذف')
      }
    } catch (err) {
      alert('حدث خطأ أثناء الحذف')
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="حذف"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
