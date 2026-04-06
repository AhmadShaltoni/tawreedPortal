'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package2, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Card, CardContent } from '@/components/ui'
import { loginUser } from '@/actions/auth'
import { useLanguage } from '@/lib/LanguageContext'
import { LanguageToggle } from '@/components/ui/LanguageToggle'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { t, dir } = useLanguage()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')

    const result = await loginUser(formData)

    if (result.success) {
      // loginUser returns the role for redirect
      const role = result.data?.role
      if (role === 'ADMIN') {
        router.push('/admin')
      } else if (role === 'SUPPLIER') {
        router.push('/supplier')
      } else {
        router.push('/buyer')
      }
      router.refresh()
    } else {
      setError(result.error || 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Language Toggle - Top Right */}
      <div className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'}`}>
        <LanguageToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <Link href="/" className={`flex items-center justify-center gap-2 mb-8 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center">
            <Package2 className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-zain-logo text-blue-900">{t.brand}</span>
        </Link>

        <h2 className="text-center text-3xl font-bold text-gray-900">
          {t.login.title}
        </h2>
        <p className="mt-2 text-center text-gray-600">
          {t.login.subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="py-8 px-6 sm:px-10">
            <form action={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Input
                id="phone"
                name="phone"
                type="tel"
                label={t.login.phone || 'رقم الهاتف'}
                placeholder="07xxxxxxxx"
                required
                autoComplete="tel"
              />

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label={t.login.password}
                  placeholder={t.login.passwordPlaceholder}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-8 text-gray-500 hover:text-gray-700 ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <label className={`flex items-center ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                  <input type="checkbox" className="rounded border-gray-300 text-blue-900 focus:ring-blue-500" />
                  <span className={`text-sm text-gray-600 ${dir === 'rtl' ? 'mr-2' : 'ml-2'}`}>{t.login.rememberMe}</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-blue-900 hover:underline">
                  {t.login.forgotPassword}
                </Link>
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t.login.signIn}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{t.login.newToTawreed}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/register">
                  <Button variant="outline" className="w-full">
                    {t.login.createAccount}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
