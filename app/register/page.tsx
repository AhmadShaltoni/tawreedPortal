'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Package2, Eye, EyeOff, Store, Truck } from 'lucide-react'
import { Button, Input, Select, Card, CardContent } from '@/components/ui'
import { registerUser } from '@/actions/auth'
import { useLanguage } from '@/lib/LanguageContext'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { interpolate } from '@/lib/i18n'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') || ''
  const { t, dir } = useLanguage()
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>(defaultRole)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')
    setFieldErrors({})

    const result = await registerUser(formData)

    if (result.success) {
      router.push('/login?registered=true')
    } else {
      if (result.errors) {
        setFieldErrors(result.errors)
      }
      setError(result.error || 'Registration failed')
      setIsLoading(false)
    }
  }

  const cityOptions = [
    { value: 'amman', label: t.register.cities.amman },
    { value: 'irbid', label: t.register.cities.irbid },
    { value: 'zarqa', label: t.register.cities.zarqa },
    { value: 'aqaba', label: t.register.cities.aqaba },
    { value: 'madaba', label: t.register.cities.madaba },
    { value: 'other', label: t.register.cities.other },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Language Toggle - Top Right */}
      <div className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'}`}>
        <LanguageToggle />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <Link href="/" className={`flex items-center justify-center gap-2 mb-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center">
            <Package2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-zain-logo text-blue-900">{t.brand}</span>
        </Link>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{t.register.title}</h2>
          <p className="mt-2 text-gray-600">{t.register.subtitle}</p>
        </div>

        {/* Role Selection */}
        {!selectedRole && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              onClick={() => setSelectedRole('BUYER')}
              className={`p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-colors group ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <div className={`w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-900 transition-colors ${dir === 'rtl' ? 'mr-auto ml-0' : 'ml-0 mr-auto'}`}>
                <Store className="w-6 h-6 text-blue-900 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t.register.imBuyer}</h3>
              <p className="text-gray-600 text-sm mt-1">{t.register.buyerDesc}</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('SUPPLIER')}
              className={`p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-orange-500 transition-colors group ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
            >
              <div className={`w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors ${dir === 'rtl' ? 'mr-auto ml-0' : 'ml-0 mr-auto'}`}>
                <Truck className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t.register.imSupplier}</h3>
              <p className="text-gray-600 text-sm mt-1">{t.register.supplierDesc}</p>
            </button>
          </div>
        )}

        {/* Registration Form */}
        {selectedRole && (
          <Card>
            <CardContent className="py-8 px-6 sm:px-10">
              <div className={`flex items-center justify-between mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  {selectedRole === 'BUYER' ? (
                    <>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-blue-900" />
                      </div>
                      <span className="font-medium">{interpolate(t.register.registeringAs, { role: t.roles.buyer })}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-orange-600" />
                      </div>
                      <span className="font-medium">{interpolate(t.register.registeringAs, { role: t.roles.supplier })}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRole('')}
                  className="text-sm text-blue-900 hover:underline"
                >
                  {t.register.change}
                </button>
              </div>

              <form action={handleSubmit} className="space-y-6">
                <input type="hidden" name="role" value={selectedRole} />

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* اسم المستخدم */}
                <Input
                  id="username"
                  name="username"
                  label={t.register.fullName}
                  placeholder={t.register.fullNamePlaceholder}
                  required
                  error={fieldErrors.username?.[0]}
                />

                {/* رقم الهاتف */}
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  label={t.register.phoneNumber}
                  placeholder="07xxxxxxxx"
                  required
                  error={fieldErrors.phone?.[0]}
                />

                {/* اسم البقالة */}
                <Input
                  id="storeName"
                  name="storeName"
                  label={t.register.businessName}
                  placeholder={selectedRole === 'BUYER' ? t.register.businessNameBuyerPlaceholder : t.register.businessNameSupplierPlaceholder}
                  required
                  error={fieldErrors.storeName?.[0]}
                />

                {/* كلمة المرور */}
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label={t.register.password}
                    placeholder={t.register.passwordPlaceholder}
                    required
                    autoComplete="new-password"
                    error={fieldErrors.password?.[0]}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-8 text-gray-500 hover:text-gray-700 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* تأكيد كلمة المرور */}
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label={t.register.confirmPassword || 'تأكيد كلمة المرور'}
                    placeholder={t.register.confirmPasswordPlaceholder || 'أعد إدخال كلمة المرور'}
                    required
                    autoComplete="new-password"
                    error={fieldErrors.confirmPassword?.[0]}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute top-8 text-gray-500 hover:text-gray-700 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* الإيميل (اختياري) */}
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label={`${t.register.emailAddress} (${t.common.optional || 'اختياري'})`}
                  placeholder={t.register.emailPlaceholder}
                  autoComplete="email"
                  error={fieldErrors.email?.[0]}
                />

                {/* المدينة والعنوان */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    id="city"
                    name="city"
                    label={t.register.city}
                    placeholder={t.register.cityPlaceholder}
                    options={cityOptions}
                    error={fieldErrors.city?.[0]}
                  />
                  <Input
                    id="businessAddress"
                    name="businessAddress"
                    label={t.register.businessAddress}
                    placeholder={t.register.addressPlaceholder}
                    error={fieldErrors.businessAddress?.[0]}
                  />
                </div>

                <div className={`flex items-start ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="mt-1 rounded border-gray-300 text-blue-900 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className={`text-sm text-gray-600 ${dir === 'rtl' ? 'mr-2' : 'ml-2'}`}>
                    {t.register.agreeToTerms}
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  variant={selectedRole === 'SUPPLIER' ? 'secondary' : 'primary'}
                  isLoading={isLoading}
                >
                  {t.register.createAccount}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-600">
                {t.register.alreadyHaveAccount}{' '}
                <Link href="/login" className="text-blue-900 font-medium hover:underline">
                  {t.register.signIn}
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { t } = useLanguage()
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">{t.common.loading}</div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
