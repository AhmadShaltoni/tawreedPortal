import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const products = await db.product.findMany({
      where: { brandId: id },
      select: {
        id: true,
        name: true,
        nameEn: true,
        image: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching brand products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productIds } = await req.json()

    // Verify brand exists
    const brand = await db.brand.findUnique({ where: { id } })
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Update products with brand
    await db.product.updateMany({
      where: { id: { in: productIds } },
      data: { brandId: id },
    })

    // Return updated products
    const products = await db.product.findMany({
      where: { brandId: id },
      select: {
        id: true,
        name: true,
        nameEn: true,
        image: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error adding products to brand:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Bulk remove products from a brand (set brandId to null)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productIds } = await req.json()
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'No products provided' }, { status: 400 })
    }

    // Only remove products that currently belong to this brand
    await db.product.updateMany({
      where: { id: { in: productIds }, brandId: id },
      data: { brandId: null },
    })

    // Return updated brand products
    const products = await db.product.findMany({
      where: { brandId: id },
      select: {
        id: true,
        name: true,
        nameEn: true,
        image: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error bulk removing products from brand:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
