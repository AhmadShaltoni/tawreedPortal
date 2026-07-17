import { NextRequest } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { authenticateStaffApiRequest, apiResponse, apiError, corsOptions } from '@/lib/api-auth'
import { approveOrderEditCore, rejectOrderEditCore } from '@/lib/order-edit-resolution'

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions()
}

const resolveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNote: z.string().max(500).optional(),
})

/**
 * POST /api/v1/admin/edit-requests/[id] — staff only
 * Approve or reject a buyer's pending order-edit request (same logic as the
 * dashboard: re-price, swap items, adjust stock, notify the buyer).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error, status } = await authenticateStaffApiRequest(request, 'orders')
  if (!user) return apiError(error ?? 'Unauthorized', status)

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('بيانات غير صحيحة', 400)
  }
  const validated = resolveSchema.safeParse(body)
  if (!validated.success) return apiError('بيانات غير صحيحة', 400)

  const result =
    validated.data.action === 'approve'
      ? await approveOrderEditCore(id, user.id, validated.data.adminNote)
      : await rejectOrderEditCore(id, user.id, validated.data.adminNote)

  if (!result.success) return apiError(result.error ?? 'فشل في معالجة طلب التعديل', 400)

  revalidatePath('/admin/orders')
  if (result.data?.orderId) revalidatePath(`/admin/orders/${result.data.orderId}`)

  return apiResponse({ success: true, action: validated.data.action, orderId: result.data?.orderId })
}
