import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'

type ValidationItem = {
  id: string
  reason: string
  message: string
  productName?: string
  variantSize?: string | null
  optionName?: string | null
  quantity?: number
  availableStock?: number
}

function describeCartItem(item: {
  variant: { size: string; product: { name: string } }
  variantOption?: { name: string } | null
}) {
  return item.variantOption
    ? `${item.variant.product.name} - ${item.variant.size} - ${item.variantOption.name}`
    : `${item.variant.product.name} - ${item.variant.size}`
}

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

// GET /api/v1/cart/validate - Validate buyer cart before checkout
export async function GET(request: NextRequest) {
  const { user, error } = await authenticateApiRequest(request)
  if (!user) return apiError(error ?? 'Unauthorized', 401)

  const cartItems = await db.cartItem.findMany({
    where: { buyerId: user.id },
    include: {
      variant: {
        include: {
          product: true,
          options: { where: { isActive: true }, select: { id: true } },
        },
      },
      productUnit: true,
      variantOption: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const invalidItems: ValidationItem[] = []

  if (cartItems.length === 0) {
    invalidItems.push({
      id: 'cart',
      reason: 'CART_EMPTY',
      message: 'Cart is empty',
    })
  }

  for (const item of cartItems) {
    const productName = item.variant.product.name
    const variantSize = item.variant.size
    const optionName = item.variantOption?.name ?? null

    if (!item.variant.product.isActive) {
      invalidItems.push({
        id: item.id,
        reason: 'PRODUCT_UNAVAILABLE',
        message: `Product "${productName}" is no longer available`,
        productName,
        variantSize,
        optionName,
        quantity: item.quantity,
      })
      continue
    }

    if (!item.variant.isActive) {
      invalidItems.push({
        id: item.id,
        reason: 'VARIANT_UNAVAILABLE',
        message: `Variant "${variantSize}" is no longer available`,
        productName,
        variantSize,
        optionName,
        quantity: item.quantity,
      })
      continue
    }

    if (item.productUnit && item.productUnit.variantId !== item.variantId) {
      invalidItems.push({
        id: item.id,
        reason: 'INVALID_UNIT',
        message: `Invalid cart item unit for "${describeCartItem(item)}"`,
        productName,
        variantSize,
        optionName,
        quantity: item.quantity,
      })
      continue
    }

    if (item.variantOptionId && !item.variantOption) {
      invalidItems.push({
        id: item.id,
        reason: 'OPTION_UNAVAILABLE',
        message: `Selected option for "${productName} - ${variantSize}" is no longer available`,
        productName,
        variantSize,
        optionName,
        quantity: item.quantity,
        availableStock: 0,
      })
      continue
    }

    if (!item.variantOption && item.variant.options.length > 0) {
      invalidItems.push({
        id: item.id,
        reason: 'OPTION_REQUIRED',
        message: `Please select an option for "${productName} - ${variantSize}"`,
        productName,
        variantSize,
        optionName,
        quantity: item.quantity,
      })
      continue
    }

    if (item.variantOption) {
      if (item.variantOption.variantId !== item.variantId || !item.variantOption.isActive) {
        invalidItems.push({
          id: item.id,
          reason: 'OPTION_UNAVAILABLE',
          message: `Option "${item.variantOption.name}" is no longer available for "${productName} - ${variantSize}"`,
          productName,
          variantSize,
          optionName,
          quantity: item.quantity,
          availableStock: 0,
        })
        continue
      }

      if (item.variantOption.stock < item.quantity) {
        invalidItems.push({
          id: item.id,
          reason: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for "${describeCartItem(item)}". Available: ${item.variantOption.stock}`,
          productName,
          variantSize,
          optionName,
          quantity: item.quantity,
          availableStock: item.variantOption.stock,
        })
      }
    } else if (item.variant.stock < item.quantity) {
      invalidItems.push({
        id: item.id,
        reason: 'INSUFFICIENT_STOCK',
        message: `Insufficient stock for "${describeCartItem(item)}". Available: ${item.variant.stock}`,
        productName,
        variantSize,
        optionName,
        quantity: item.quantity,
        availableStock: item.variant.stock,
      })
    }
  }

  return apiResponse({
    valid: invalidItems.length === 0,
    invalidItems,
    itemCount: cartItems.length,
  })
}
