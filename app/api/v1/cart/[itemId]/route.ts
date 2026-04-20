import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { updateCartItemSchema } from '@/lib/validations'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// PATCH /api/v1/cart/[itemId] - Update cart item quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { itemId } = await params

  const cartItem = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { variant: true },
  })

  if (!cartItem || cartItem.buyerId !== user.id) {
    return apiError('Cart item not found', 404)
  }

  const body = await request.json()
  const validated = updateCartItemSchema.safeParse(body)
  if (!validated.success) {
    return apiResponse({ error: 'Validation failed', errors: validated.error.flatten().fieldErrors }, 400)
  }

  // Check stock
  if (cartItem.variant.stock < validated.data.quantity) {
    return apiError(`Only ${cartItem.variant.stock} items available`, 400)
  }

  const updated = await db.cartItem.update({
    where: { id: itemId },
    data: { quantity: validated.data.quantity },
    include: { variant: { include: { product: true } } },
  })

  return apiResponse({ item: updated })
}

// DELETE /api/v1/cart/[itemId] - Remove item from cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const { itemId } = await params

  const cartItem = await db.cartItem.findUnique({ where: { id: itemId } })
  if (!cartItem || cartItem.buyerId !== user.id) {
    return apiError('Cart item not found', 404)
  }

  await db.cartItem.delete({ where: { id: itemId } })

  return apiResponse({ message: 'Item removed from cart' })
}
