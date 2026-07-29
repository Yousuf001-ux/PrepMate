import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * NextAuth middleware configuration for route-level authentication guards.
 * Intercepts requests to protected routes, checks the JWT token status, and redirects:
 * - Un-onboarded users are directed to the onboarding screen.
 * - Onboarded users attempting to visit the onboarding screen are redirected to the core chatmate view.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth") || req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register";
    const isOnboardingRoute = req.nextUrl.pathname === "/onboarding";

    // If the user has a valid authenticated session token
    if (token) {
      // Force completion of onboarding before they can access dashboard routes
      if (!token.onboardingCompleted && !isOnboardingRoute && !isAuthRoute) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
      // Do not allow users who are already onboarded to view the onboarding screens again
      if (token.onboardingCompleted && isOnboardingRoute) {
        return NextResponse.redirect(new URL("/chatmate", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Determines whether the request is authorized. Returning true allows the middleware function to run.
      // Returning false redirects unauthenticated requests automatically to the sign-in page (/login).
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/chatmate/:path*",
    "/courses/:path*",
    "/study-plan/:path*",
    "/progress/:path*",
    "/onboarding",
    "/api/courses/:path*",
    "/api/study-plans/:path*",
    "/api/summarizer/:path*",
    "/api/quiz/:path*",
    "/api/progress/:path*",
    "/api/sessions/:path*",
  ],
};
