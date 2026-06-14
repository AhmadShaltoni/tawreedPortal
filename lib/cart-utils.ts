/**
 * Cart utilities for formatting cart items with complete selection details
 * Including size (variant), flavor (option), and selling unit information
 */

import { calcProductDiscount, applyDiscount } from '@/lib/discount-engine'

export async function formatCartItem(item: any) {
  // Get variant and ensure units are available
  const variant = item.variant
  const units = Array.isArray(variant?.units) ? variant.units : []
  
  const selectedUnit = item.productUnit || units.find((u: any) => u.isDefault)
  let unitPrice = item.variantOption?.priceOverride ?? selectedUnit?.price ?? 0

  // Calculate campaign discount for this product
  const productId = variant?.product?.id
  const categoryId = variant?.product?.categoryId || variant?.product?.category?.id || ''
  const collectionIds = variant?.product?.collections?.map((c: any) => c.collectionId) || []
  
  let campaignDiscount = 0
  let originalPrice = unitPrice
  
  if (productId) {
    campaignDiscount = await calcProductDiscount(productId, categoryId, collectionIds)
    if (campaignDiscount > 0) {
      originalPrice = unitPrice
      unitPrice = applyDiscount(unitPrice, campaignDiscount)
    }
  }

  return {
    id: item.id,
    quantity: item.quantity,
    note: item.note || null,
    product: {
      id: variant?.product?.id,
      name: variant?.product?.name,
      nameEn: variant?.product?.nameEn,
      image: variant?.product?.image,
      category: variant?.product?.category,
      brand: variant?.product?.brand,
    },
    // Selected variant (size)
    selectedVariant: {
      id: variant?.id,
      size: variant?.size,
      sizeEn: variant?.sizeEn,
      stock: variant?.stock,
    },
    // Selected option (flavor) - if any
    selectedOption: item.variantOption ? {
      id: item.variantOption.id,
      name: item.variantOption.name,
      nameEn: item.variantOption.nameEn,
      stock: item.variantOption.stock,
      priceOverride: item.variantOption.priceOverride,
    } : null,
    // Selected unit (selling unit like piece, dozen, carton)
    selectedUnit: selectedUnit ? {
      id: selectedUnit.id,
      unit: selectedUnit.unit,
      label: selectedUnit.label,
      labelEn: selectedUnit.labelEn,
      piecesPerUnit: selectedUnit.piecesPerUnit,
      price: campaignDiscount > 0 ? applyDiscount(selectedUnit.price, campaignDiscount) : selectedUnit.price,
      compareAtPrice: campaignDiscount > 0 ? selectedUnit.price : selectedUnit.compareAtPrice,
    } : null,
    // Pricing
    pricing: {
      pricePerUnit: unitPrice,
      compareAtPricePerUnit: campaignDiscount > 0 ? originalPrice : (item.variantOption?.priceOverride ? null : selectedUnit?.compareAtPrice),
      subtotal: Math.round(unitPrice * item.quantity * 100) / 100,
      discountPercent: campaignDiscount > 0 ? campaignDiscount : null,
    },
  }
}

export const CART_ITEM_INCLUDE = {
  variant: {
    include: {
      product: {
        include: {
          category: { select: { id: true, name: true, nameEn: true, slug: true } },
          brand: { select: { id: true, name: true, nameEn: true, logo: true } },
          collections: { select: { collectionId: true } },
        },
      },
      units: { orderBy: { sortOrder: 'asc' as const } },
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' as const } },
    },
  },
  productUnit: {
    select: {
      id: true,
      unit: true,
      label: true,
      labelEn: true,
      piecesPerUnit: true,
      price: true,
      compareAtPrice: true,
    },
  },
  variantOption: {
    select: {
      id: true,
      name: true,
      nameEn: true,
      stock: true,
      priceOverride: true,
    },
  },
}
