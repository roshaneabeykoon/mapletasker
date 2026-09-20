import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decrypt } from "@/lib/session";

/** Tasker-only routes. */
const PROTECTED_ROUTES = ["/tasks"];
/** Routes a signed-in tasker has no reason to see. */
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Optimistic auth redirects only — this reads the cookie and never touches the
 * database, because it runs on every request including prefetches. The real
 * check lives in the Data Access Layer (`getCurrentTasker`).
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((route) => path.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => path.startsWith(route));

  if (!isProtected && !isAuthRoute) return NextResponse.next();

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  if (isProtected && !session) {
    const login = new URL("/login", request.nextUrl);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/tasks", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
