import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { updateCartItemSchema } from '@/lib/validations'
import { formatCartItem, CART_ITEM_INCLUDE } from '@/lib/cart-utils'

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
    include: { variant: { include: { options: { where: { isActive: true } } } }, variantOption: true },
  })

  if (!cartItem || cartItem.buyerId !== user.id) {
    return apiError('Cart item not found', 404)
  }

  const body = await request.json()
  const validated = updateCartItemSchema.safeParse(body)
  if (!validated.success) {
    return apiResponse({ error: 'Validation failed', errors: validated.error.flatten().fieldErrors }, 400)
  }

  // Check stock based on whether option is selected
  if (cartItem.variantOptionId) {
    const option = await db.variantOption.findUnique({ where: { id: cartItem.variantOptionId } })
    if (!option || option.stock < validated.data.quantity) {
      return apiError(`Only ${option?.stock ?? 0} items available for this option`, 400)
    }
  } else {
    if (cartItem.variant.stock < validated.data.quantity) {
      return apiError(`Only ${cartItem.variant.stock} items available`, 400)
    }
  }

  const updated = await db.cartItem.update({
    where: { id: itemId },
    data: {
      quantity: validated.data.quantity,
      ...(validated.data.note !== undefined ? { note: validated.data.note.trim() || null } : {}),
    },
    include: CART_ITEM_INCLUDE,
  })

  const formattedItem = await formatCartItem(updated)
  return apiResponse({ item: formattedItem })
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
