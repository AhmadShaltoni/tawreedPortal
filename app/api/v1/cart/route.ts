import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { addToCartSchema } from '@/lib/validations'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/cart - Get buyer's cart
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const cartItems = await db.cartItem.findMany({
    where: { buyerId: user.id },
    include: {
      product: {
        include: { category: { select: { id: true, name: true, nameEn: true, slug: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return apiResponse({ items: cartItems, total, itemCount: cartItems.length })
}

// POST /api/v1/cart - Add item to cart
export async function POST(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const body = await request.json()
  const validated = addToCartSchema.safeParse(body)
  if (!validated.success) {
    return apiResponse({ error: 'Validation failed', errors: validated.error.flatten().fieldErrors }, 400)
  }

  // Check product exists and is active
  const product = await db.product.findUnique({ where: { id: validated.data.productId } })
  if (!product || !product.isActive) {
    return apiError('Product not found or unavailable', 404)
  }

  // Check minimum order quantity
  if (validated.data.quantity < product.minOrderQuantity) {
    return apiError(`Minimum order quantity is ${product.minOrderQuantity}`, 400)
  }

  // Check stock
  if (product.stock < validated.data.quantity) {
    return apiError(`Only ${product.stock} items available`, 400)
  }

  // Upsert cart item
  const cartItem = await db.cartItem.upsert({
    where: { buyerId_productId: { buyerId: user.id, productId: validated.data.productId } },
    create: {
      buyerId: user.id,
      productId: validated.data.productId,
      quantity: validated.data.quantity,
    },
    update: {
      quantity: validated.data.quantity,
    },
    include: { product: true },
  })

  return apiResponse({ item: cartItem }, 201)
}

// DELETE /api/v1/cart - Clear cart
export async function DELETE(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  await db.cartItem.deleteMany({ where: { buyerId: user.id } })

  return apiResponse({ message: 'Cart cleared' })
}
