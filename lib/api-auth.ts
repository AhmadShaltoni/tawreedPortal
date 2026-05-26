import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { decode } from 'next-auth/jwt'

type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN'

interface ApiUser {
  id: string
  phone: string
  email?: string | null
  username: string
  role: UserRole
  storeName?: string | null
}

async function authenticateBearerToken(request: Request): Promise<{ user: ApiUser | null; error: string | null } | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
      return { user: null, error: 'Server configuration error' }
    }

    // Decode the JWT token
    const decoded = await decode({ token, salt: '', secret })
    if (!decoded || !decoded.id) {
      return { user: null, error: 'Invalid token' }
    }

    // Fetch user from database
    const user = await db.user.findUnique({
      where: { id: decoded.id as string },
      select: { id: true, phone: true, email: true, username: true, role: true, storeName: true, isActive: true },
    })

    if (!user || !user.isActive) {
      return { user: null, error: 'User not found or inactive' }
    }

    return {
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        username: user.username,
        role: user.role as UserRole,
        storeName: user.storeName,
      },
      error: null,
    }
  } catch {
    return { user: null, error: 'Invalid token' }
  }
}

// Authenticate API requests via Authorization header or session cookie
export async function authenticateApiRequest(request: Request): Promise<{ user: ApiUser | null; error: string | null }> {
  // Mobile/API clients may still carry stale web cookies, so an explicit
  // Authorization header must take precedence over session cookies.
  const bearerAuth = await authenticateBearerToken(request)
  if (bearerAuth) return bearerAuth

  // Fall back to session auth for web requests.
  const session = await auth()
  if (session?.user) {
    return {
      user: {
        id: session.user.id,
        phone: session.user.phone,
        email: session.user.email,
        username: session.user.username,
        role: session.user.role,
        storeName: session.user.storeName,
      },
      error: null,
    }
  }

  return { user: null, error: 'Authentication required' }
}

// CORS headers for browser & mobile
function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

// Handle preflight OPTIONS requests
export function corsOptions() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  })
}

// Helper to create JSON responses with CORS headers
export function apiResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders(),
  })
}

export function apiError(message: string, status = 400) {
  return Response.json(
    { error: message },
    {
      status,
      headers: corsHeaders(),
    }
  )
}
