import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth);

  const isAdminRoute = pathname.startsWith("/admin");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isMutatingApiRoute =
    pathname.startsWith("/api") && !pathname.startsWith("/api/auth");

  if (isAdminRoute && !isPublicAdminPath && !isAuthed) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isMutatingApiRoute && !isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdminRoute && isPublicAdminPath && isAuthed) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
