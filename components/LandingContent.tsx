'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { 
  Package2, 
  ShoppingCart, 
  TrendingUp, 
  Shield, 
  Clock, 
  Users,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useLanguage } from '@/lib/LanguageContext'

// Component for animated counting numbers
function CountUpNumber({ value, duration = 3000 }: { value: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const animationRef = useRef<number | null>(null)
  
  // Parse the numeric value from string like "472+", "12,000+"
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10)
  const suffix = value.includes('+') ? '+' : ''
  const hasComma = value.includes(',')
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          setIsVisible(true)
        } else {
          // Reset when element leaves viewport
          setIsVisible(false)
          setCount(0)
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
          }
        }
      },
      { threshold: 0.5 }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => {
      observer.disconnect()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])
  
  // Start animation when visible
  useEffect(() => {
    if (isVisible) {
      const startTime = performance.now()
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentCount = Math.floor(easeOutQuart * numericValue)
        
        setCount(currentCount)
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        }
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [isVisible, numericValue, duration])
  
  // Format number with comma if original had comma
  const formattedCount = hasComma 
    ? count.toLocaleString('en-US') 
    : count.toString()
  
  return (
    <span ref={ref} className="tabular-nums">
      {formattedCount}{suffix}
    </span>
  )
}

export function LandingContent() {
  const { t, dir } = useLanguage()

  const features = [
    {
      icon: ShoppingCart,
      title: t.features.easyProcurement,
      description: t.features.easyProcurementDesc,
    },
    {
      icon: TrendingUp,
      title: t.features.bestPrices,
      description: t.features.bestPricesDesc,
    },
    {
      icon: Shield,
      title: t.features.verifiedPartners,
      description: t.features.verifiedPartnersDesc,
    },
    {
      icon: Clock,
      title: t.features.fastDelivery,
      description: t.features.fastDeliveryDesc,
    },
    {
      icon: Users,
      title: t.features.growingNetwork,
      description: t.features.growingNetworkDesc,
    },
    {
      icon: Package2,
      title: t.features.wideSelection,
      description: t.features.wideSelectionDesc,
    },
  ]

  const buyerSteps = [
    { step: '1', title: t.howItWorks.createRequest, desc: t.howItWorks.createRequestDesc },
    { step: '2', title: t.howItWorks.receiveOffers, desc: t.howItWorks.receiveOffersDesc },
    { step: '3', title: t.howItWorks.acceptAndTrack, desc: t.howItWorks.acceptAndTrackDesc },
  ]

  const supplierSteps = [
    { step: '1', title: t.howItWorks.browseRequests, desc: t.howItWorks.browseRequestsDesc },
    { step: '2', title: t.howItWorks.submitOffers, desc: t.howItWorks.submitOffersDesc },
    { step: '3', title: t.howItWorks.fulfillOrders, desc: t.howItWorks.fulfillOrdersDesc },
  ]

  const categories = [
    t.categories.sweets,
    t.categories.rice,
    t.categories.sugar,
    t.categories.beverages,
    t.categories.snacks,
    t.categories.cookingOil,
    t.categories.flourAndGrains,
    t.categories.cannedGoods,
    t.categories.spices,
    t.categories.cleaning,
    t.categories.personalCare,
    t.categories.more,
  ]

  const stats = [
    { label: t.hero.activeRequests, value: '472+' },
    { label: t.hero.registeredSuppliers, value: '130+' },
    { label: t.hero.successfulOrders, value: '12,000+' },
  ]

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className={`grid lg:grid-cols-2 gap-12 items-center ${dir === 'rtl' ? 'lg:grid-flow-dense' : ''}`}>
            <div className={dir === 'rtl' ? 'lg:col-start-2' : ''}>
              <div className={`inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <span className="bg-orange-500 w-2 h-2 rounded-full animate-pulse" />
                <span className="text-sm">{t.hero.title}</span>
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6 font-zain-logo text-orange-400">
                {t.hero.subtitle}
              </h1>
              <p className="text-xl text-blue-100 mb-8 max-w-lg">
                {t.hero.description}
              </p>
              <div className={`flex flex-col sm:flex-row gap-4 ${dir === 'rtl' ? 'sm:flex-row-reverse sm:justify-end' : ''}`}>
                <Link href="/register?role=BUYER">
                  <Button size="lg" variant="secondary" className={`w-full sm:w-auto ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {t.hero.imBuyer}
                    <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? 'mr-2 rtl-flip' : 'ml-2'}`} />
                  </Button>
                </Link>
                <Link href="/register?role=SUPPLIER">
                  <Button size="lg" variant="outline" className={`w-full sm:w-auto border-white text-white hover:bg-white/10 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    {t.hero.imSupplier}
                    <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? 'mr-2 rtl-flip' : 'ml-2'}`} />
                  </Button>
                </Link>
              </div>
            </div>
            {/* Stats Card - Desktop */}
            <div className={`hidden lg:block ${dir === 'rtl' ? 'lg:col-start-1' : ''}`}>
              <div className="relative">
                <div className={`absolute -top-4 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl ${dir === 'rtl' ? '-right-4' : '-left-4'}`} />
                <div className={`absolute -bottom-4 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl ${dir === 'rtl' ? '-left-4' : '-right-4'}`} />
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="space-y-4">
                    {stats.map((stat) => (
                      <div key={stat.label} className={`flex justify-between items-center py-3 border-b border-white/10 last:border-0 ${dir === 'rtl' ? 'flex-row' : ''}`}>
                        <span className="text-blue-100">{stat.label}</span>
                        <span className="text-2xl font-bold">
                          <CountUpNumber value={stat.value} duration={3000} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Mobile */}
      <section className="lg:hidden relative bg-blue-900 py-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-orange-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
            <div className="grid grid-cols-3 gap-2 text-center">
              {stats.map((stat, index) => (
                <div 
                  key={stat.label} 
                  className={`relative py-2 ${index < stats.length - 1 ? `after:absolute after:top-1/2 after:-translate-y-1/2 after:h-16 after:w-px after:bg-gradient-to-b after:from-transparent after:via-white/30 after:to-transparent ${dir === 'rtl' ? 'after:left-0' : 'after:right-0'}` : ''}`}
                >
                  <div className="text-blue-200/80 text-[10px] sm:text-xs font-medium mb-1 leading-tight">{stat.label}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    <CountUpNumber value={stat.value} duration={3000} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-zain-title">
              {t.features.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-zain-regular">
              {t.features.subtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className={`group p-6 rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <div className={`w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-900 transition-colors ${dir === 'rtl' ? 'ml-auto mr-0' : 'ml-0 mr-auto'}`}>
                  <feature.icon className="w-6 h-6 text-blue-900 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-zain-title">
              {t.howItWorks.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-zain-regular">
              {t.howItWorks.subtitle}
            </p>
          </div>

          <div className={`grid lg:grid-cols-2 gap-16 ${dir === 'rtl' ? 'lg:grid-flow-dense' : ''}`}>
            {/* For Buyers */}
            <div className={`bg-white rounded-2xl p-8 shadow-sm border border-gray-200 ${dir === 'rtl' ? 'text-right lg:col-start-2' : ''}`}>
              <div className={`inline-flex items-center gap-2 bg-blue-100 text-blue-900 rounded-full px-4 py-2 mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <ShoppingCart className="w-4 h-4" />
                <span className="font-medium">{t.howItWorks.forBuyers}</span>
              </div>
              <div className="space-y-6" >
                {buyerSteps.map((item) => (
                  <div key={item.step} className={`flex gap-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <div className="w-10 h-10 bg-blue-900 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register?role=BUYER" className="block mt-8">
                <Button className="w-full">{t.howItWorks.startAsBuyer}</Button>
              </Link>
            </div>

            {/* For Suppliers */}
            <div className={`bg-white rounded-2xl p-8 shadow-sm border border-gray-200 ${dir === 'rtl' ? 'text-right lg:col-start-1' : ''}`}>
              <div className={`inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-2 mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <Package2 className="w-4 h-4" />
                <span className="font-medium">{t.howItWorks.forSuppliers}</span>
              </div>
              <div className="space-y-6">
                {supplierSteps.map((item) => (
                  <div key={item.step} className={`flex gap-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}}`}>
                    <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register?role=SUPPLIER" className="block mt-8">
                <Button variant="secondary" className="w-full">{t.howItWorks.startAsSupplier}</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 font-zain-title">
              {t.categories.title}
            </h2>
            <p className="text-xl text-gray-600 font-zain-regular">
              {t.categories.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <div key={category} className="bg-gray-50 rounded-xl p-4 text-center hover:bg-blue-50 hover:text-blue-900 transition-colors cursor-pointer">
                <span className="font-medium">{category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 font-zain-title">
            {t.cta.title}
          </h2>
          <p className="text-xl text-blue-100 mb-8 font-zain-regular">
            {t.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className={dir === 'rtl' ? 'flex-row-reverse' : ''}>
                {t.cta.getStartedFree}
                <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? 'mr-2 rtl-flip' : 'ml-2'}`} />
              </Button>
            </Link>
          </div>
          <div className={`mt-8 flex flex-wrap justify-center gap-6 text-blue-100 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {[t.cta.noSetupFees, t.cta.freeToRegister, t.cta.cancelAnytime].map((item) => (
              <div key={item} className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
