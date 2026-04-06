'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { useLanguage } from '@/lib/LanguageContext'
import { adminCreateUser } from '@/actions/users'

export function NewUserForm() {
  const { t, dir } = useLanguage()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roleOptions = [
    { value: 'BUYER', label: t.roles.buyer },
    { value: 'SUPPLIER', label: t.roles.supplier },
    { value: 'ADMIN', label: t.roles.admin },
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const result = await adminCreateUser(formData)

    if (result.success) {
      router.push('/admin/users')
    } else {
      setError(result.error || null)
      setFieldErrors(result.errors || {})
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Link href="/admin/users" className="text-gray-500 hover:text-gray-700">
          <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t.userManagement.addUser}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">{t.userManagement.addUser}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label={t.userManagement.name} name="name" required error={fieldErrors.name?.[0]} />
            <Input label={t.userManagement.email} name="email" type="email" dir="ltr" required error={fieldErrors.email?.[0]} />
            <Input label={t.userManagement.password} name="password" type="password" dir="ltr" required error={fieldErrors.password?.[0]} />
            <Input label={t.userManagement.phone} name="phone" dir="ltr" error={fieldErrors.phone?.[0]} />
            <Select label={t.userManagement.role} name="role" options={roleOptions} required error={fieldErrors.role?.[0]} />
            <Input label={t.userManagement.businessName} name="businessName" error={fieldErrors.businessName?.[0]} />
            <Input label={t.userManagement.city} name="city" error={fieldErrors.city?.[0]} />
            <Input label={t.userManagement.businessAddress} name="businessAddress" error={fieldErrors.businessAddress?.[0]} />
          </CardContent>
        </Card>

        <div className={`flex items-center gap-4 mt-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {t.userManagement.addUser}
          </Button>
          <Link href="/admin/users">
            <Button type="button" variant="outline">{t.common.cancel}</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
