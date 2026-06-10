'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Save, Loader2, Check, X, MapPin } from 'lucide-react'
import { getDeliveryZonesWithCities, createOrUpdateZoneForCity, bulkUpdateZones, initializeAllZones } from '@/actions/delivery'
import { Button } from '@/components/ui/Button'

interface CityWithZone {
  id: string
  name: string
  nameEn: string
  sortOrder: number
  deliveryZone: {
    id: string
    fee: number
    isActive: boolean
    isVisible: boolean
    freeDeliveryThreshold: number | null
    freeDeliveryEnabled: boolean | null
    estimatedDays: number | null
    notes: string | null
  } | null
}

export default function DeliveryZonesPage() {
  const [cities, setCities] = useState<CityWithZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingCity, setSavingCity] = useState<string | null>(null)
  const [editingCity, setEditingCity] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    fee: number
    isActive: boolean
    isVisible: boolean
    freeDeliveryThreshold: string
    estimatedDays: string
    notes: string
  }>({ fee: 3, isActive: true, isVisible: true, freeDeliveryThreshold: '', estimatedDays: '', notes: '' })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [bulkFee, setBulkFee] = useState('')
  const [isBulkSaving, setIsBulkSaving] = useState(false)

  const loadData = useCallback(async () => {
    const data = await getDeliveryZonesWithCities()
    setCities(data as CityWithZone[])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function startEdit(city: CityWithZone) {
    setEditingCity(city.id)
    const zone = city.deliveryZone
    setEditForm({
      fee: zone?.fee ?? 3,
      isActive: zone?.isActive ?? true,
      isVisible: zone?.isVisible ?? true,
      freeDeliveryThreshold: zone?.freeDeliveryThreshold?.toString() ?? '',
      estimatedDays: zone?.estimatedDays?.toString() ?? '',
      notes: zone?.notes ?? '',
    })
  }

  async function saveZone(cityId: string) {
    setSavingCity(cityId)
    const result = await createOrUpdateZoneForCity(cityId, {
      fee: editForm.fee,
      isActive: editForm.isActive,
      isVisible: editForm.isVisible,
      freeDeliveryThreshold: editForm.freeDeliveryThreshold ? parseFloat(editForm.freeDeliveryThreshold) : null,
      estimatedDays: editForm.estimatedDays ? parseInt(editForm.estimatedDays) : null,
      notes: editForm.notes || null,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'تم الحفظ' })
      setEditingCity(null)
      await loadData()
    } else {
      setMessage({ type: 'error', text: result.error || 'خطأ' })
    }
    setSavingCity(null)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleBulkSetFee() {
    if (!bulkFee) return
    setIsBulkSaving(true)
    const fee = parseFloat(bulkFee)
    const updates = cities.map((city) => ({ cityId: city.id, fee }))
    const result = await bulkUpdateZones(updates)
    if (result.success) {
      setMessage({ type: 'success', text: `تم تعيين ${fee} د.أ لجميع المحافظات` })
      await loadData()
    }
    setIsBulkSaving(false)
    setBulkFee('')
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleInitializeAll() {
    setIsBulkSaving(true)
    const result = await initializeAllZones(3.0)
    if (result.success) {
      setMessage({ type: 'success', text: 'تم تهيئة جميع المناطق' })
      await loadData()
    }
    setIsBulkSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleBulkToggle(active: boolean) {
    setIsBulkSaving(true)
    const updates = cities.map((city) => ({ cityId: city.id, isActive: active }))
    const result = await bulkUpdateZones(updates)
    if (result.success) {
      setMessage({ type: 'success', text: active ? 'تم تفعيل جميع المحافظات' : 'تم تعطيل جميع المحافظات' })
      await loadData()
    }
    setIsBulkSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  const definedZones = cities.filter((c) => c.deliveryZone)
  const undefinedCities = cities.filter((c) => !c.deliveryZone)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/delivery" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">إدارة مناطق التوصيل</h1>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Bulk Actions */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="font-semibold text-gray-900 mb-3">إجراءات جماعية</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="سعر موحد (د.أ)"
              value={bulkFee}
              onChange={(e) => setBulkFee(e.target.value)}
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={handleBulkSetFee} isLoading={isBulkSaving} disabled={!bulkFee}>
              تطبيق على الكل
            </Button>
          </div>
          <div className="h-6 border-r border-gray-300" />
          <Button size="sm" variant="outline" onClick={() => handleBulkToggle(true)} isLoading={isBulkSaving}>
            تفعيل الكل
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkToggle(false)} isLoading={isBulkSaving}>
            تعطيل الكل
          </Button>
          {undefinedCities.length > 0 && (
            <>
              <div className="h-6 border-r border-gray-300" />
              <Button size="sm" variant="outline" onClick={handleInitializeAll} isLoading={isBulkSaving}>
                <MapPin className="w-4 h-4" />
                تهيئة المحافظات ({undefinedCities.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Zones Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">المحافظة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الرسوم (د.أ)</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">الحالة</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">مرئية</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">عتبة المجاني</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">المدة (أيام)</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cities.map((city) => {
              const zone = city.deliveryZone
              const isEditing = editingCity === city.id

              if (isEditing) {
                return (
                  <tr key={city.id} className="bg-blue-50/50">
                    <td className="px-4 py-3 font-medium">{city.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editForm.fee}
                        onChange={(e) => setEditForm({ ...editForm, fee: parseFloat(e.target.value) || 0 })}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.isVisible}
                          onChange={(e) => setEditForm({ ...editForm, isVisible: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editForm.freeDeliveryThreshold}
                        onChange={(e) => setEditForm({ ...editForm, freeDeliveryThreshold: e.target.value })}
                        placeholder="—"
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={editForm.estimatedDays}
                        onChange={(e) => setEditForm({ ...editForm, estimatedDays: e.target.value })}
                        placeholder="—"
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => saveZone(city.id)}
                          disabled={savingCity === city.id}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          {savingCity === city.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setEditingCity(null)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={city.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">{city.name}</span>
                      <span className="text-gray-400 text-xs mr-2">({city.nameEn})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {zone ? (
                      zone.fee === 0 ? (
                        <span className="text-green-600 font-medium">مجاني</span>
                      ) : (
                        <span>{zone.fee} د.أ</span>
                      )
                    ) : (
                      <span className="text-gray-400">غير محدد</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!zone ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : zone.isActive ? (
                      <span className="text-green-600 text-xs">مفعّل</span>
                    ) : (
                      <span className="text-red-600 text-xs">معطّل</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!zone ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : zone.isVisible ? (
                      <span className="text-blue-600 text-xs">مرئية</span>
                    ) : (
                      <span className="text-yellow-600 text-xs">مخفية</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {zone?.freeDeliveryThreshold ? `${zone.freeDeliveryThreshold} د.أ` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {zone?.estimatedDays ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => startEdit(city)}
                      className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
