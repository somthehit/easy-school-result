import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect dashboard routes; allow public routes
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Public paths
  const publicPaths = ["/login", "/signup", "/verify", "/api/auth/login", "/api/auth/logout"];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const auth = req.cookies.get("auth_user")?.value;
    if (!auth) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
