import { getUnitTypesWithUsage } from '@/actions/unit-types'
import { UnitsPageClient } from './UnitsPageClient'

export const dynamic = 'force-dynamic'

export default async function UnitsPage() {
  const unitTypes = await getUnitTypesWithUsage()
  return <UnitsPageClient unitTypes={unitTypes} />
}
