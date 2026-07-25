'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, ArrowLeft, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { formatDate } from '@/lib/utils'
import { unblockPhone } from '@/actions/users'

interface Props {
  blocked: Array<{
    id: string
    phoneMasked: string | null
    reason: string | null
    createdAt: Date
  }>
}

export function BlockedPhonesClient({ blocked }: Props) {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  async function handleUnblock(id: string) {
    setPending(id)
    const response = await unblockPhone(id)
    setPending(null)
    if (response.success) {
      router.refresh()
    } else {
      alert(response.error || t.userManagement.unblockError)
    }
  }

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <ShieldX className="w-6 h-6 text-amber-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t.userManagement.blockedPhonesTitle}</h1>
        </div>
        <Link href="/admin/users">
          <Button variant="ghost" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <BackIcon className="w-4 h-4" />
            {t.userManagement.backToUsers}
          </Button>
        </Link>
      </div>

      <p className="text-sm text-gray-500">{t.userManagement.blockedPhonesDesc}</p>

      <Card>
        <CardContent>
          {blocked.length === 0 ? (
            <p className="text-center text-gray-500 py-12">{t.userManagement.noBlocked}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.phone}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.reason}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.userManagement.blockedAt}</th>
                    <th className={`pb-3 font-medium text-gray-500 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {blocked.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 text-gray-700 dir-ltr">{row.phoneMasked || '—'}</td>
                      <td className="py-3 text-gray-600">{row.reason || '—'}</td>
                      <td className="py-3 text-gray-600">{formatDate(row.createdAt)}</td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnblock(row.id)}
                          disabled={pending === row.id}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          {pending === row.id ? t.common.loading : t.userManagement.unblock}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
