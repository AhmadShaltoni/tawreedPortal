'use server'

import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { signIn, signOut } from '@/lib/auth'
import { signUpSchema, signInSchema } from '@/lib/validations'
import type { ActionResponse } from '@/types'
import { redirect } from 'next/navigation'

export async function registerUser(formData: FormData): Promise<ActionResponse> {
  const rawData = {
    username: formData.get('username'),
    phone: formData.get('phone'),
    storeName: formData.get('storeName'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    email: formData.get('email') || undefined,
    role: formData.get('role'),
    businessAddress: formData.get('businessAddress') || undefined,
    city: formData.get('city') || undefined,
  }

  const validated = signUpSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const { username, phone, password, storeName, email, role, businessAddress, city } = validated.data

  // Check if user already exists by phone
  const existingUserByPhone = await db.user.findUnique({
    where: { phone },
  })

  if (existingUserByPhone) {
    return {
      success: false,
      error: 'رقم الهاتف مسجل بالفعل',
    }
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingUserByEmail = await db.user.findUnique({
      where: { email },
    })

    if (existingUserByEmail) {
      return {
        success: false,
        error: 'البريد الإلكتروني مسجل بالفعل',
      }
    }
  }

  // Hash password
  const passwordHash = await hash(password, 12)

  // Create user
  await db.user.create({
    data: {
      phone,
      username,
      storeName,
      passwordHash,
      email: email || null,
      role,
      businessAddress: businessAddress || null,
      city: city || null,
    },
  })

  return { success: true }
}

export async function loginUser(formData: FormData): Promise<ActionResponse<{ role: string }>> {
  const rawData = {
    phone: formData.get('phone'),
    password: formData.get('password'),
  }

  const validated = signInSchema.safeParse(rawData)

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  try {
    await signIn('credentials', {
      phone: validated.data.phone,
      password: validated.data.password,
      redirect: false,
    })

    // Fetch user role for redirect
    const user = await db.user.findUnique({
      where: { phone: validated.data.phone },
      select: { role: true },
    })

    return { success: true, data: { role: user?.role ?? 'BUYER' } }
  } catch {
    return {
      success: false,
      error: 'رقم الهاتف أو كلمة المرور غير صحيحة',
    }
  }
}

export async function logoutUser() {
  await signOut({ redirect: false })
  redirect('/login')
}
