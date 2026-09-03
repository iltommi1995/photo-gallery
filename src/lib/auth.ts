import { headers } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { verifyCredentials } from "@/lib/auth/verify-credentials";
import { checkRateLimit } from "@/lib/rate-limit";

const LOGIN_RATE_LIMIT = { max: 5, windowMs: 60_000 };

// CSRF on the /api/admin/** mutation routes: Auth.js's session cookie
// defaults to SameSite=Lax (HttpOnly), which browsers withhold from
// cross-site fetch/XHR/form POST-PUT-PATCH-DELETE requests — a cross-origin
// page can't ride the admin's session to call these routes. That's why
// there's no separate CSRF token scheme here; adding one would be
// redundant for this single-admin app.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const requestHeaders = await headers();
        const ip =
          requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const { allowed } = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
        if (!allowed) return null;

        return verifyCredentials(rawCredentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
