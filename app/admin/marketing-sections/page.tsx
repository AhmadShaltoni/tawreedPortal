import { getMarketingSections } from '@/actions/marketing-sections'
import { MarketingSectionsClient } from './MarketingSectionsClient'

export default async function MarketingSectionsPage() {
  const sections = await getMarketingSections()

  return <MarketingSectionsClient sections={sections} />
}
