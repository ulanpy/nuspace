import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Authentication Middleware for Next.js
 * 
 * Note: This middleware runs during development with `next dev`.
 * For production static export (output: 'export'), middleware doesn't run.
 * 
 * All pages are publicly accessible - authentication is handled at the
 * functionality level (API calls, actions) via the useUser hook and
 * backend authentication, not at the route level.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

/**
 * Check if the request has valid authentication cookies
 * The app uses access_token, refresh_token, and app_token cookies
 */
function checkAuthentication(request: NextRequest): boolean {
  // Check for any of the auth cookies
  // access_token is the primary indicator of authentication
  const accessToken = request.cookies.get('access_token')?.value
  const appToken = request.cookies.get('app_token')?.value
  
  // User is authenticated if they have either token
  return !!(accessToken || appToken)
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = checkAuthentication(request)
  
  // Check if path is public-only (landing page)
  const isPublicOnlyPath = pathname === '/' || pathname === ''
  
  // Requirement 4.3: Redirect authenticated users from landing page to announcements
  // This is the only route-level protection - authenticated users skip the landing page
  if (isPublicOnlyPath && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/announcements'
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

// Configure which paths the middleware should run on
// Excludes static files, API routes, and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (/api/*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|.*\\..*$).*)',
  ],
}
