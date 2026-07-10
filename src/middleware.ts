import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 不保护登录页和 auth API
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    // 已登录用户访问 /login → 跳转到首页
    if (pathname === "/login") {
      const res = NextResponse.next();
      const session = await getIronSession<SessionData>(
        request,
        res,
        sessionOptions,
      );
      if (session.isLoggedIn) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // 不保护静态资源
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/sw.js")
  ) {
    return NextResponse.next();
  }

  // 检查登录状态
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    res,
    sessionOptions,
  );

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - API routes (由各自路由自行处理)
     * - 静态文件
     */
    "/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest.json|sw.js).*)",
  ],
};
