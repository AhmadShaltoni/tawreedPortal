'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useLanguage } from '@/lib/LanguageContext'
import {
  buildWhatsAppMessage,
  buildOrderSheetHtml,
  normalizeWhatsAppPhone,
  type DispatchOrder,
} from '@/lib/order-dispatch'

const PHONE_STORAGE_KEY = 'tawreed:lastDeliveryPhone'

export function SendToDelivery({ order }: { order: DispatchOrder }) {
  const { t, lang } = useLanguage()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Remember the last driver number typed — usually the same person.
  // Read after mount (not a lazy initializer) so SSR and first client render
  // agree on an empty value and no hydration mismatch occurs.
  useEffect(() => {
    const saved = localStorage.getItem(PHONE_STORAGE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load of persisted value on mount
    if (saved) setPhone(saved)
  }, [])

  function handleWhatsApp() {
    const trimmed = phone.trim()
    if (!trimmed) {
      setError(t.dispatch.phoneRequired)
      return
    }
    setError(null)
    localStorage.setItem(PHONE_STORAGE_KEY, trimmed)
    const number = normalizeWhatsAppPhone(trimmed)
    const text = buildWhatsAppMessage(order, lang)
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  function handleDownload() {
    const html = buildOrderSheetHtml(order, lang)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">{t.dispatch.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{t.dispatch.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          label={t.dispatch.phoneLabel}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            if (error) setError(null)
          }}
          placeholder={t.dispatch.phonePlaceholder}
          error={error ?? undefined}
          dir="ltr"
          inputMode="tel"
        />
        <p className="text-xs text-gray-400">{t.dispatch.phoneHint}</p>

        <Button variant="primary" className="w-full gap-2 bg-[#25D366] hover:bg-[#1eb658] focus:ring-[#25D366]" onClick={handleWhatsApp}>
          <MessageCircle className="w-4 h-4" />
          {t.dispatch.whatsappButton}
        </Button>

        <Button variant="outline" className="w-full gap-2" onClick={handleDownload}>
          <Download className="w-4 h-4" />
          {t.dispatch.downloadButton}
        </Button>
      </CardContent>
    </Card>
  )
}
