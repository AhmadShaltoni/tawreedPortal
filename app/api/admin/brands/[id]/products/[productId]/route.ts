import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminLike } from '@/lib/permissions'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params
    const user = await getCurrentUser()
    if (!isAdminLike(user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify brand exists
    const brand = await db.brand.findUnique({ where: { id } })
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Remove brand from product (set to null)
    await db.product.update({
      where: { id: productId },
      data: { brandId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing product from brand:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
