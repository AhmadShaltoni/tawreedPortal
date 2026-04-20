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
      variant: {
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true, nameEn: true, slug: true } },
            },
          },
          units: { orderBy: { sortOrder: 'asc' } },
        },
      },
      productUnit: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const total = cartItems.reduce((sum, item) => {
    const unitPrice = item.productUnit?.price ?? item.variant.units.find(u => u.isDefault)?.price ?? 0
    return sum + unitPrice * item.quantity
  }, 0)

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

  // Check variant exists and is active
  const variant = await db.productVariant.findUnique({
    where: { id: validated.data.variantId },
    include: { product: true },
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

  // Check minimum order quantity
  if (validated.data.quantity < variant.minOrderQuantity) {
    return apiError(`Minimum order quantity is ${variant.minOrderQuantity}`, 400)
  }

  // Check stock
  if (variant.stock < validated.data.quantity) {
    return apiError(`Only ${variant.stock} items available`, 400)
  }

  const productUnitId = validated.data.productUnitId ?? null

  // Find existing cart item with same variant+unit combo
  const existing = await db.cartItem.findFirst({
    where: {
      buyerId: user.id,
      variantId: validated.data.variantId,
      productUnitId: productUnitId,
    },
  })

  let cartItem
  if (existing) {
    // Item already exists - increment the quantity
    const newQuantity = existing.quantity + validated.data.quantity
    cartItem = await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQuantity },
      include: { variant: { include: { product: true } }, productUnit: true },
    })
  } else {
    // New item - create it
    cartItem = await db.cartItem.create({
      data: {
        buyerId: user.id,
        variantId: validated.data.variantId,
        productUnitId: productUnitId,
        quantity: validated.data.quantity,
      },
      include: { variant: { include: { product: true } }, productUnit: true },
    })
  }

  return apiResponse({ item: cartItem }, 201)
}

// DELETE /api/v1/cart - Clear cart
export async function DELETE(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  await db.cartItem.deleteMany({ where: { buyerId: user.id } })

  return apiResponse({ message: 'Cart cleared' })
}
