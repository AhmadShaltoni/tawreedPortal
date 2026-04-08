import { auth } from '@/lib/auth'
import { HeaderClient } from './HeaderClient'

export async function Header() {
  const session = await auth()

  const user = session?.user ? {
    id: session.user.id as string,
    username: session.user.username,
    email: session.user.email,
    role: session.user.role as string,
    storeName: session.user.storeName as string | null,
  } : null

  return <HeaderClient user={user} />
}
