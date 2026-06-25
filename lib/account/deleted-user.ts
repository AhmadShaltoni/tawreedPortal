import type { Prisma } from '@prisma/client'

// Reserved sentinel phone for the shared placeholder buyer that inherits
// anonymized orders from deleted accounts. It is intentionally not a valid
// Jordanian mobile number so it can never collide with a real user.
export const DELETED_USER_PLACEHOLDER_PHONE = '+962000000000'

/**
 * Find (or lazily create) the shared system placeholder buyer used to retain
 * anonymized order history after a user deletes their account.
 *
 * The placeholder is an inactive BUYER with no usable credentials. Orders from
 * deleted users are reassigned to it so financial/business history is kept
 * while no personal data remains.
 */
export async function getOrCreateDeletedUserPlaceholder(
  tx: Prisma.TransactionClient
): Promise<string> {
  const existing = await tx.user.findUnique({
    where: { phone: DELETED_USER_PLACEHOLDER_PHONE },
    select: { id: true },
  })
  if (existing) return existing.id

  const placeholder = await tx.user.create({
    data: {
      phone: DELETED_USER_PLACEHOLDER_PHONE,
      username: 'حساب محذوف',
      // Random unusable password hash — this account can never be logged into.
      passwordHash: 'deleted-account-placeholder',
      role: 'BUYER',
      isActive: false,
      isVerified: false,
      deliveryAreas: [],
    },
    select: { id: true },
  })

  return placeholder.id
}
