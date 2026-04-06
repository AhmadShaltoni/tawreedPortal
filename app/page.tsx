import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { LandingContent } from '@/components/LandingContent'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <LandingContent />
      <Footer />
    </div>
  )
}
