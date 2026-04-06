// Authentication configuration using NextAuth v5
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

// Define UserRole locally since Prisma types may not be immediately available
type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN'

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string
    phone: string
    email?: string | null
    username: string
    role: UserRole
    storeName?: string | null
  }
  
  interface Session {
    user: {
      id: string
      phone: string
      email?: string | null
      username: string
      role: UserRole
      storeName?: string | null
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        phone: { label: 'Phone', type: 'tel' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          return null
        }

        const phone = credentials.phone as string
        const password = credentials.password as string

        const user = await db.user.findUnique({
          where: { phone },
        })

        if (!user || !user.isActive) {
          return null
        }

        const isPasswordValid = await compare(password, user.passwordHash)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          phone: user.phone,
          email: user.email,
          username: user.username,
          role: user.role as UserRole,
          storeName: user.storeName,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.phone = user.phone
        token.role = user.role
        token.storeName = user.storeName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.phone = token.phone as string
        session.user.role = token.role as UserRole
        session.user.storeName = token.storeName as string | null | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})

// Helper to get the current session (for server components)
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

// Helper to check if user has a specific role
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    return { authorized: false, user: null, error: 'Not authenticated' }
  }
  
  if (!allowedRoles.includes(user.role)) {
    return { authorized: false, user, error: 'Not authorized' }
  }
  
  return { authorized: true, user, error: null }
}
