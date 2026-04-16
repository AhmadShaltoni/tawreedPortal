'use client'

import { useRef, useState, useCallback } from 'react'
import { translateArabicToEnglish } from '@/lib/translate'

/**
 * Hook that auto-translates Arabic fields into their English counterparts.
 *
 * Usage:
 *   const translate = useAutoTranslate()
 *
 *   // Mark fields that already have English values (edit forms)
 *   useEffect(() => { if (existingEn) translate.markTouched('nameEn') }, [])
 *
 *   // Arabic input
 *   <Input onBlur={e => translate.handleBlur(e.target.value, nameEnRef, 'nameEn')} />
 *
 *   // English input — attach ref + detect manual edits
 *   <Input ref={nameEnRef} onInput={() => translate.markTouched('nameEn')} />
 *
 *   // Optional retry button
 *   <button onClick={() => translate.retry('nameEn', arabicValue, nameEnRef)}>Retry</button>
 */
export function useAutoTranslate() {
  const [translatingField, setTranslatingField] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  /** Fields the user has manually typed in — we never overwrite these. */
  const touchedFields = useRef<Set<string>>(new Set())

  /** Abort controller for the in-flight request so we can cancel stale calls. */
  const abortRef = useRef<AbortController | null>(null)

  // -----------------------------------------------------------------------
  // Public helpers
  // -----------------------------------------------------------------------

  /** Mark a field as manually edited so auto-translate won't touch it. */
  const markTouched = useCallback((fieldName: string) => {
    touchedFields.current.add(fieldName)
  }, [])

  /** Check whether a field has been manually touched. */
  const isTouched = useCallback((fieldName: string) => {
    return touchedFields.current.has(fieldName)
  }, [])

  /** Dismiss the warning banner. */
  const dismissWarning = useCallback(() => setWarning(null), [])

  // -----------------------------------------------------------------------
  // Core translation logic (shared between blur & retry)
  // -----------------------------------------------------------------------

  const doTranslate = useCallback(
    async (
      arabicText: string,
      targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
      fieldName: string,
      force = false,
    ) => {
      // Don't overwrite manually-edited fields (unless forced via retry after clearing touch)
      if (!force && touchedFields.current.has(fieldName)) return

      const trimmed = arabicText.trim()
      if (!trimmed) return

      // Cancel any previous in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setTranslatingField(fieldName)
      setWarning(null)

      try {
        const translated = await translateArabicToEnglish(trimmed, controller.signal)

        // Double-check: user might have typed while we waited
        if (touchedFields.current.has(fieldName)) return

        if (translated && targetRef.current) {
          // Use native setter so React sees the change even on uncontrolled inputs
          const nativeSetter =
            targetRef.current instanceof HTMLTextAreaElement
              ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
              : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set

          nativeSetter?.call(targetRef.current, translated)
          targetRef.current.dispatchEvent(new Event('input', { bubbles: true }))
        }
      } catch (err: unknown) {
        // Ignore aborted requests (user typed again quickly)
        if (err instanceof DOMException && err.name === 'AbortError') return

        setWarning(
          'ar' // placeholder — the form will read the translated string from t
        )
      } finally {
        setTranslatingField((prev) => (prev === fieldName ? null : prev))
      }
    },
    [],
  )

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /**
   * Call on the Arabic field's `onBlur`.
   * Translates the value and populates the English ref — unless the user
   * has manually edited the English field.
   */
  const handleBlur = useCallback(
    (
      arabicText: string,
      targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
      fieldName: string,
    ) => {
      doTranslate(arabicText, targetRef, fieldName)
    },
    [doTranslate],
  )

  /**
   * Manual retry — ignores the "touched" flag for this specific call but
   * does NOT clear the flag (the user can still freely edit afterwards).
   */
  const retry = useCallback(
    (
      fieldName: string,
      arabicText: string,
      targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
    ) => {
      // Temporarily allow overwrite for this single call
      touchedFields.current.delete(fieldName)
      doTranslate(arabicText, targetRef, fieldName, false)
    },
    [doTranslate],
  )

  return {
    /** Attach to the Arabic field's onBlur */
    handleBlur,
    /** Call on the English field's onInput / onChange to mark manual edits */
    markTouched,
    /** Check if a field was manually edited */
    isTouched,
    /** The field name currently being translated, or null */
    translatingField,
    /** Non-null when the last translation attempt failed */
    warning,
    /** Dismiss the warning */
    dismissWarning,
    /** Retry translation for a specific field */
    retry,
  }
}
