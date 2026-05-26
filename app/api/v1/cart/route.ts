import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { addToCartSchema } from '@/lib/validations'
import { formatCartItem, CART_ITEM_INCLUDE } from '@/lib/cart-utils'

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
    include: CART_ITEM_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  // Format each cart item with complete details
  const formattedItems = await Promise.all(cartItems.map(item => formatCartItem(item)))

  const total = formattedItems.reduce((sum, item) => sum + item.pricing.subtotal, 0)

  return apiResponse({
    items: formattedItems,
    total: Math.round(total * 100) / 100,
    itemCount: formattedItems.length,
  })
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

  // Check variant exists and is active
  const variant = await db.productVariant.findUnique({
    where: { id: validated.data.variantId },
    include: { product: true, options: { where: { isActive: true } } },
  })
  if (!variant || !variant.isActive || !variant.product.isActive) {
    return apiError('Product variant not found or unavailable', 404)
  }

  // Validate productUnitId if provided
  if (validated.data.productUnitId) {
    const productUnit = await db.productUnit.findUnique({ where: { id: validated.data.productUnitId } })
    if (!productUnit || productUnit.variantId !== variant.id) {
      return apiError('Invalid product unit', 400)
    }
  }

  // Validate variantOptionId if provided
  let variantOptionId: string | null = null
  let selectedOptionStock: number | null = null
  if (validated.data.variantOptionId) {
    const variantOption = await db.variantOption.findUnique({
      where: { id: validated.data.variantOptionId },
    })
    if (!variantOption || variantOption.variantId !== variant.id || !variantOption.isActive) {
      return apiError('Invalid variant option', 400)
    }
    // Check option stock
    if (variantOption.stock < validated.data.quantity) {
      return apiError(`Only ${variantOption.stock} items available for this option`, 400)
    }
    variantOptionId = variantOption.id
    selectedOptionStock = variantOption.stock
  } else if (variant.options.length > 0) {
    // Variant has options but none selected — require selection
    return apiError('Please select an option (e.g., flavor)', 400)
  }

  // Check minimum order quantity
  if (validated.data.quantity < variant.minOrderQuantity) {
    return apiError(`Minimum order quantity is ${variant.minOrderQuantity}`, 400)
  }

  // Check stock (variant-level when no options exist)
  if (!variantOptionId && variant.stock < validated.data.quantity) {
    return apiError(`Only ${variant.stock} items available`, 400)
  }

  const productUnitId = validated.data.productUnitId ?? null

  // Find existing cart item with same variant+unit+option combo
  const existing = await db.cartItem.findFirst({
    where: {
      buyerId: user.id,
      variantId: validated.data.variantId,
      productUnitId: productUnitId,
      variantOptionId: variantOptionId,
    },
  })

  let cartItem
  if (existing) {
    // Item already exists - increment the quantity
    const newQuantity = existing.quantity + validated.data.quantity
    const availableStock = selectedOptionStock ?? variant.stock
    if (availableStock < newQuantity) {
      const existingWithDetails = await db.cartItem.findUnique({
        where: { id: existing.id },
        include: CART_ITEM_INCLUDE,
      })
      const formattedExisting = existingWithDetails ? await formatCartItem(existingWithDetails) : null

      return apiResponse({
        error: `Only ${availableStock} items available. You already have ${existing.quantity} in your cart`,
        item: formattedExisting,
        availableStock,
        existingQuantity: existing.quantity,
      }, 400)
    }

    cartItem = await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQuantity },
      include: CART_ITEM_INCLUDE,
    })
  } else {
    // New item - create it
    cartItem = await db.cartItem.create({
      data: {
        buyerId: user.id,
        variantId: validated.data.variantId,
        productUnitId: productUnitId,
        variantOptionId: variantOptionId,
        quantity: validated.data.quantity,
      },
      include: CART_ITEM_INCLUDE,
    })
  }

  const formattedItem = await formatCartItem(cartItem)
  return apiResponse({ item: formattedItem }, 201)
}

// DELETE /api/v1/cart - Clear cart
export async function DELETE(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  await db.cartItem.deleteMany({ where: { buyerId: user.id } })

  return apiResponse({ message: 'Cart cleared' })
}
