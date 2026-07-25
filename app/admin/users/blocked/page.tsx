import { getBlockedPhones } from '@/actions/users'
import { BlockedPhonesClient } from './BlockedPhonesClient'

export default async function BlockedPhonesPage() {
  const blocked = await getBlockedPhones()
  return <BlockedPhonesClient blocked={blocked} />
}
