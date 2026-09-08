import { headers } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { RequiresTwoFactorError } from "@/lib/auth/errors";
import { verifyCredentials } from "@/lib/auth/verify-credentials";
import { checkRateLimit } from "@/lib/rate-limit";

// A 2FA-enabled login makes two authorize() calls sharing this bucket
// (discover-2FA, then verify-code) — higher than a single-factor login's
// natural budget so one mistyped code doesn't eat most of it.
const LOGIN_RATE_LIMIT = { max: 8, windowMs: 60_000 };

// CSRF on the /api/admin/** mutation routes: Auth.js's session cookie
// defaults to SameSite=Lax (HttpOnly), which browsers withhold from
// cross-site fetch/XHR/form POST-PUT-PATCH-DELETE requests — a cross-origin
// page can't ride the admin's session to call these routes. That's why
// there's no separate CSRF token scheme here; adding one would be
// redundant for this single-admin app.
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required outside Vercel (which auto-detects and trusts its own host) —
  // without it Auth.js refuses to trust the incoming Host header from a
  // reverse proxy like Nginx Proxy Manager and every request 500s with a
  // generic "Configuration" error, discovered live in production. NPM is
  // the only thing that can reach this app's port, so trusting the host it
  // forwards is safe here.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Code", type: "text" },
      },
      async authorize(rawCredentials) {
        const requestHeaders = await headers();
        const ip =
          requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const { allowed } = checkRateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
        if (!allowed) return null;

        const result = await verifyCredentials(rawCredentials);
        if (result.status === "requires-2fa") throw new RequiresTwoFactorError();
        if (result.status !== "ok") return null;
        return result.admin;
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
