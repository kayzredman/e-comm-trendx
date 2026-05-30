import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Dashboard and CMS routes require authentication
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/cms(.*)', '/pos(.*)'])
// Courier PWA uses phone-OTP, never Clerk — skip middleware entirely to avoid
// session-refresh redirect loops when loaded over LAN IPs.
const isCourierRoute = createRouteMatcher(['/courier(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isCourierRoute(req)) return NextResponse.next()
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
