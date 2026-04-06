import { auth } from '@/lib/auth'
import { HeaderClient } from './HeaderClient'

export async function Header() {
  const session = await auth()

  const user = session?.user ? {
    id: session.user.id as string,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as string,
    businessName: session.user.businessName as string | null,
  } : null

  return <HeaderClient user={user} />
}
