import { getUsers } from '@/actions/users'
import { UserListClient } from './UserListClient'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string; page?: string }>
}) {
  const params = await searchParams
  const role = params.role
  const search = params.search
  const page = Number(params.page) || 1

  const { users, total, pages } = await getUsers({ role, search, page })

  return (
    <UserListClient
      users={users as any}
      total={total}
      pages={pages}
      currentPage={page}
      currentRole={role}
      currentSearch={search}
    />
  )
}
