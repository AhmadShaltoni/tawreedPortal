'use client'

import Link from 'next/link'
import { Package2 } from 'lucide-react'
import { useLanguage } from '@/lib/LanguageContext'
import { interpolate } from '@/lib/i18n'

export function Footer() {
  const { t, dir } = useLanguage()

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-8 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className={`flex items-center gap-2 mb-4 ${dir === 'rtl' ? 'flex-row-reverse justify-end' : ''}`}>
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Package2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold font-zain-logo">{t.brand}</span>
            </div>
            <p className="text-gray-400 max-w-md font-zain-regular">
              {t.footer.description}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 font-zain-title">{t.footer.quickLinks}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/register?role=BUYER" className="text-gray-400 hover:text-white transition-colors">
                  {t.footer.forBuyers}
                </Link>
              </li>
              <li>
                <Link href="/register?role=SUPPLIER" className="text-gray-400 hover:text-white transition-colors">
                  {t.footer.forSuppliers}
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  {t.footer.howItWorks}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 font-zain-title">{t.footer.contact}</h3>
            <ul className="space-y-2 text-gray-400">
              <li>{t.footer.email}</li>
              <li><span dir="ltr">{t.footer.phone}</span></li>
              <li>{t.footer.location}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>{interpolate(t.footer.copyright, { year: new Date().getFullYear().toString() })}</p>
        </div>
      </div>
    </footer>
  )
}
