import type { OrderItem } from '@prisma/client'
import type { PricedItem } from '@/lib/order-pricing'

/**
 * Shared helpers for the buyer order-edit flow: build a human-readable
 * before → after diff between the current order and a proposed set of priced
 * lines, and detect delivery-field changes. Used both when a buyer submits an
 * edit request (stored on the request for the dashboard) and, informally, when
 * an admin reviews it.
 */

export interface EditDiffLine {
  productId: string | null
  productName: string
  productNameEn: string | null
  productImage: string | null
  variantSize: string | null
  variantSizeEn: string | null
  variantOptionName: string | null
  variantOptionNameEn: string | null
  unitLabel: string | null
  unitLabelEn: string | null
  quantity: number
  pricePerUnit: number
  totalPrice: number
}

export interface EditDiffChange {
  before: EditDiffLine
  after: EditDiffLine
  quantityDelta: number
}

export interface DeliveryFieldChange {
  before: string | null
  after: string | null
}

export interface OrderEditDiff {
  added: EditDiffLine[]
  removed: EditDiffLine[]
  changed: EditDiffChange[]
  unchanged: EditDiffLine[]
  delivery: {
    address?: DeliveryFieldChange
    addressDetails?: DeliveryFieldChange
    city?: DeliveryFieldChange
    notes?: DeliveryFieldChange
  }
  totals: {
    before: { productsTotal: number; deliveryFee: number; grandTotal: number }
    after: { productsTotal: number; deliveryFee: number; grandTotal: number }
  }
  hasChanges: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Matching key for a line. Prefer the live selection references (present on
 * direct orders and on every priced line); fall back to a display signature so
 * legacy items without variant ids still diff reasonably.
 */
function lineKey(
  refs: { variantId: string | null; variantOptionId: string | null; productUnitId: string | null },
  fallback: { productName: string; variantSize: string | null; variantOptionName: string | null; unitLabel: string | null }
): string {
  if (refs.variantId) {
    return `v:${refs.variantId}|${refs.variantOptionId ?? ''}|${refs.productUnitId ?? ''}`
  }
  return `s:${fallback.productName}|${fallback.variantSize ?? ''}|${fallback.variantOptionName ?? ''}|${fallback.unitLabel ?? ''}`
}

function orderItemToLine(item: OrderItem): EditDiffLine {
  return {
    productId: item.productId,
    productName: item.productName,
    productNameEn: item.productNameEn,
    productImage: item.productImage,
    variantSize: item.variantSize,
    variantSizeEn: item.variantSizeEn,
    variantOptionName: item.variantOptionName,
    variantOptionNameEn: item.variantOptionNameEn,
    unitLabel: item.unitLabel,
    unitLabelEn: item.unitLabelEn,
    quantity: item.quantity,
    pricePerUnit: item.pricePerUnit,
    totalPrice: item.totalPrice,
  }
}

function pricedToLine(p: PricedItem): EditDiffLine {
  return {
    productId: p.productId,
    productName: p.productName,
    productNameEn: p.productNameEn,
    productImage: p.productImage,
    variantSize: p.variantSize,
    variantSizeEn: p.variantSizeEn,
    variantOptionName: p.variantOptionName,
    variantOptionNameEn: p.variantOptionNameEn,
    unitLabel: p.unitLabel,
    unitLabelEn: p.unitLabelEn,
    quantity: p.quantity,
    pricePerUnit: p.pricePerUnit,
    totalPrice: p.totalPrice,
  }
}

export interface CurrentDelivery {
  deliveryAddress: string
  deliveryAddressDetails: string | null
  deliveryCity: string
  buyerNotes: string | null
}

export interface ProposedDelivery {
  deliveryAddress?: string | null
  deliveryAddressDetails?: string | null
  deliveryCity?: string | null
  buyerNotes?: string | null
}

/** Normalize an optional string for comparison (undefined = unchanged). */
function changedField(before: string | null, after: string | null | undefined): DeliveryFieldChange | undefined {
  if (after === undefined) return undefined
  const a = (after ?? '').trim() || null
  const b = (before ?? '').trim() || null
  if (a === b) return undefined
  return { before: b, after: a }
}

export interface BuildDiffInput {
  currentItems: OrderItem[]
  proposedItems: PricedItem[]
  currentProductsTotal: number
  currentDeliveryFee: number
  proposedProductsTotal: number
  proposedDeliveryFee: number
  currentDelivery: CurrentDelivery
  proposedDelivery: ProposedDelivery
}

export function buildOrderEditDiff(input: BuildDiffInput): OrderEditDiff {
  const {
    currentItems, proposedItems,
    currentProductsTotal, currentDeliveryFee,
    proposedProductsTotal, proposedDeliveryFee,
    currentDelivery, proposedDelivery,
  } = input

  // Reward prize items are auto-added and not editable by the buyer; exclude
  // them from the "removed" set so they don't look like a buyer removal.
  const currentEditable = currentItems.filter((i) => !i.isReward)

  const currentByKey = new Map<string, OrderItem>()
  for (const item of currentEditable) {
    currentByKey.set(lineKey(item, {
      productName: item.productName,
      variantSize: item.variantSize,
      variantOptionName: item.variantOptionName,
      unitLabel: item.unitLabel,
    }), item)
  }

  const added: EditDiffLine[] = []
  const changed: EditDiffChange[] = []
  const unchanged: EditDiffLine[] = []
  const seenKeys = new Set<string>()

  for (const p of proposedItems) {
    const key = lineKey(p, {
      productName: p.productName,
      variantSize: p.variantSize,
      variantOptionName: p.variantOptionName,
      unitLabel: p.unitLabel,
    })
    seenKeys.add(key)
    const current = currentByKey.get(key)
    const afterLine = pricedToLine(p)
    if (!current) {
      added.push(afterLine)
    } else if (current.quantity !== p.quantity) {
      changed.push({
        before: orderItemToLine(current),
        after: afterLine,
        quantityDelta: p.quantity - current.quantity,
      })
    } else {
      unchanged.push(afterLine)
    }
  }

  const removed: EditDiffLine[] = []
  for (const [key, item] of currentByKey) {
    if (!seenKeys.has(key)) removed.push(orderItemToLine(item))
  }

  const delivery: OrderEditDiff['delivery'] = {}
  const addr = changedField(currentDelivery.deliveryAddress, proposedDelivery.deliveryAddress)
  const addrDetails = changedField(currentDelivery.deliveryAddressDetails, proposedDelivery.deliveryAddressDetails)
  const city = changedField(currentDelivery.deliveryCity, proposedDelivery.deliveryCity)
  const notes = changedField(currentDelivery.buyerNotes, proposedDelivery.buyerNotes)
  if (addr) delivery.address = addr
  if (addrDetails) delivery.addressDetails = addrDetails
  if (city) delivery.city = city
  if (notes) delivery.notes = notes

  const hasChanges =
    added.length > 0 || removed.length > 0 || changed.length > 0 || Object.keys(delivery).length > 0

  return {
    added,
    removed,
    changed,
    unchanged,
    delivery,
    totals: {
      before: {
        productsTotal: round2(currentProductsTotal),
        deliveryFee: round2(currentDeliveryFee),
        grandTotal: round2(currentProductsTotal + currentDeliveryFee),
      },
      after: {
        productsTotal: round2(proposedProductsTotal),
        deliveryFee: round2(proposedDeliveryFee),
        grandTotal: round2(proposedProductsTotal + proposedDeliveryFee),
      },
    },
    hasChanges,
  }
}
