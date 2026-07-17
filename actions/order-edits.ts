'use server'

import { requirePermission } from '@/lib/auth'
import { approveOrderEditCore, rejectOrderEditCore } from '@/lib/order-edit-resolution'
import type { ActionResponse } from '@/types'
import { revalidatePath } from 'next/cache'

/**
 * Admin resolution of a buyer's order-edit request (dashboard entry points).
 * The actual approve/reject logic lives in lib/order-edit-resolution.ts and is
 * shared with the mobile admin API.
 */

export async function approveOrderEdit(editRequestId: string, adminNote?: string): Promise<ActionResponse> {
  const { authorized, user, error } = await requirePermission('orders')
  if (!authorized || !user) return { success: false, error: error ?? 'Not authorized' }

  const result = await approveOrderEditCore(editRequestId, user.id, adminNote)
  if (!result.success) return { success: false, error: result.error, errors: result.errors }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${result.data?.orderId}`)
  return { success: true }
}

export async function rejectOrderEdit(editRequestId: string, adminNote?: string): Promise<ActionResponse> {
  const { authorized, user, error } = await requirePermission('orders')
  if (!authorized || !user) return { success: false, error: error ?? 'Not authorized' }

  const result = await rejectOrderEditCore(editRequestId, user.id, adminNote)
  if (!result.success) return { success: false, error: result.error, errors: result.errors }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${result.data?.orderId}`)
  return { success: true }
}
