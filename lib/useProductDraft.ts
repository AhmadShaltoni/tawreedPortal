import { useEffect, useRef } from 'react'
import { createDefaultUnit, type VariantEntry, type UnitTypeOption } from '@/components/admin/VariantsEditor'

/**
 * localStorage draft persistence for the product add/edit forms.
 *
 * If a save fails (or the tab is closed) the user shouldn't have to re-enter
 * everything. We snapshot the serializable form state (text fields, selected
 * ids, and variants WITHOUT the raw File objects but WITH any already-uploaded
 * image URLs). Files can't be serialized, but once an image is uploaded its
 * Cloudinary URL survives in the draft — so nothing needs re-uploading either.
 */

const PREFIX = 'product-draft:'

/** A variant without the non-serializable File / blob-URL preview. */
export type DraftVariant = Omit<VariantEntry, 'imageFile' | 'imagePreview' | 'options'> & {
  options: Array<Omit<VariantEntry['options'][number], 'imageFile' | 'imagePreview'>>
}

/** Serializable snapshot of the product add/edit form. */
export interface ProductDraft {
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  keywords: string
  selectedPath: string[]
  additionalCategoryIds: string[]
  selectedBrandId: string
  selectedSupplierId: string
  selectedCollectionIds: string[]
  selectedTagIds: string[]
  variants: DraftVariant[]
  /** Already-uploaded main image URL (blobs/files are not persisted). */
  mainImageUrl: string | null
}

/** Drop File/blob fields from a variant so it can be JSON-serialized. */
export function stripVariantFiles(v: VariantEntry): DraftVariant {
  return {
    size: v.size,
    sizeEn: v.sizeEn,
    sku: v.sku,
    barcode: v.barcode,
    stock: v.stock,
    minOrderQuantity: v.minOrderQuantity,
    isDefault: v.isDefault,
    existingImage: v.existingImage,
    units: v.units,
    options: v.options.map((o) => ({
      name: o.name,
      nameEn: o.nameEn,
      stock: o.stock,
      priceOverride: o.priceOverride,
      existingImage: o.existingImage,
    })),
  }
}

/** Rebuild a full VariantEntry from a draft (previews come from stored URLs). */
export function hydrateVariant(v: DraftVariant, unitTypes: UnitTypeOption[]): VariantEntry {
  return {
    ...v,
    imageFile: null,
    imagePreview: v.existingImage,
    units: v.units && v.units.length ? v.units : [createDefaultUnit(unitTypes)],
    options: v.options.map((o) => ({
      ...o,
      imageFile: null,
      imagePreview: o.existingImage,
    })),
  }
}

function storageKey(key: string) {
  return PREFIX + key
}

export function loadDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(storageKey(key))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(key))
  } catch {
    /* ignore */
  }
}

/**
 * Debounced autosave of `snapshot` under `key`.
 * `enabled` should be turned on only AFTER the restore prompt has been resolved,
 * so autosaving the empty initial state can't clobber a stored draft.
 * `dep` is a value that changes whenever the form is edited (e.g. a tick
 * counter) — it drives when the debounced save re-runs, so uncontrolled text
 * inputs read at save time are captured too.
 */
export function useDraftAutosave<T>(key: string, snapshot: T, enabled: boolean, dep?: unknown) {
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const handle = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(key), JSON.stringify(snapshotRef.current))
      } catch {
        /* storage full / unavailable — ignore */
      }
    }, 800)
    return () => clearTimeout(handle)
  }, [key, enabled, dep])
}
