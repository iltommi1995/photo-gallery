import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];
// /api/auth: NextAuth's own endpoints. /api/media: serves generated photo
// variants, which must stay publicly viewable on the site (see the route).
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/media"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth);

  const isAdminRoute = pathname.startsWith("/admin");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isMutatingApiRoute =
    pathname.startsWith("/api") &&
    !PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

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
