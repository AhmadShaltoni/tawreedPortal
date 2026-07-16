import { NextResponse, type NextRequest } from 'next/server'

// Forwards the request pathname as a header so server components (the admin
// layout) can read the current route and enforce per-route permissions.
// No auth runs here — this stays edge-safe and cheap.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-pathname', request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/admin/:path*'],
}
