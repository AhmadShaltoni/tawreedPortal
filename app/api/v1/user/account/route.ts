import { NextRequest } from 'next/server'
import { authenticateApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { deleteAccount } from '@/actions/account'

export async function OPTIONS() {
  return corsOptions()
}

/**
 * DELETE /api/v1/user/account
 * Permanently delete the authenticated buyer's account and all personal data.
 *
 * Preserves only non-personal, hashed records required to prevent reuse of
 * single-use coupons, the welcome bonus, and referral rewards after a user
 * deletes and re-registers with the same phone number.
 *
 * The JWT becomes invalid immediately since the user no longer exists.
 */
export async function DELETE(request: NextRequest) {
  const { user, error: authError } = await authenticateApiRequest(request)
  if (!user) {
    return apiError(authError || 'Authentication required', 401)
  }

  const result = await deleteAccount(user.id)
  if (!result.success) {
    const status = result.error === 'لا يمكن حذف هذا النوع من الحسابات' ? 403 : 400
    return apiError(result.error || 'فشل حذف الحساب', status)
  }

  return apiResponse({
    success: true,
    message: 'تم حذف الحساب بنجاح',
  })
}
