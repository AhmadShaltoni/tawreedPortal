import { getMarketingSection } from '@/actions/marketing-sections'
import { notFound } from 'next/navigation'
import { MarketingSectionForm } from '../MarketingSectionForm'
import { SectionProductsManager } from '../SectionProductsManager'

export default async function EditMarketingSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const section = await getMarketingSection(id)

  if (!section) notFound()

  return (
    <div className="p-6 space-y-8">
      <MarketingSectionForm section={section} />
      <SectionProductsManager
        sectionId={section.id}
        products={section.products.map((cp) => cp.product)}
      />
    </div>
  )
}
