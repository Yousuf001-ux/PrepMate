import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth") || req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/register";
    const isOnboardingRoute = req.nextUrl.pathname === "/onboarding";

    if (token) {
      if (!token.onboardingCompleted && !isOnboardingRoute && !isAuthRoute) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
      if (token.onboardingCompleted && isOnboardingRoute) {
        return NextResponse.redirect(new URL("/chatmate", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chatmate/:path*",
    "/courses/:path*",
    "/study-plan/:path*",
    "/summarizer/:path*",
    "/quiz/:path*",
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
