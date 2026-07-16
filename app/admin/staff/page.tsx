import { getStaff } from '@/actions/staff'
import { StaffClient } from './StaffClient'

export default async function AdminStaffPage() {
  const staff = await getStaff()
  return <StaffClient staff={staff} />
}
