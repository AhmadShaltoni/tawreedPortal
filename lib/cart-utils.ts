/**
 * Cart utilities for formatting cart items with complete selection details
 * Including size (variant), flavor (option), and selling unit information
 */

export async function formatCartItem(item: any) {
  // Get variant and ensure units are available
  const variant = item.variant
  const units = Array.isArray(variant?.units) ? variant.units : []
  
  const selectedUnit = item.productUnit || units.find((u: any) => u.isDefault)
  const unitPrice = item.variantOption?.priceOverride ?? selectedUnit?.price ?? 0

  return {
    id: item.id,
    quantity: item.quantity,
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
      price: selectedUnit.price,
      compareAtPrice: selectedUnit.compareAtPrice,
    } : null,
    // Pricing
    pricing: {
      pricePerUnit: unitPrice,
      compareAtPricePerUnit: item.variantOption?.priceOverride ? null : selectedUnit?.compareAtPrice,
      subtotal: unitPrice * item.quantity,
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
