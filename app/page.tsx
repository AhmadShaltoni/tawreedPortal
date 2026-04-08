import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { LandingContent } from '@/components/LandingContent'
import { NoticesBar } from '@/components/NoticesBar'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <NoticesBar />
      <LandingContent />
      <Footer />
    </div>
  )
}
