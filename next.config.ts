import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: the dev server rejects HMR's websocket (and other requests)
  // from a host it doesn't recognize as "same origin as localhost" —
  // needed to test from a phone, whether via the LAN IP (port-forwarded
  // from Windows to WSL) or a cloudflared/localtunnel tunnel, whose
  // hostname is otherwise unknown to it and gets a 401 on /_next/hmr.
  allowedDevOrigins: ["192.168.1.78", "*.trycloudflare.com", "*.loca.lt"],
  // `next build` re-typechecks the whole project from scratch on top of
  // what it already needed for compilation — pure duplicate work in
  // this repo's deploy pipeline, where the `verify` job (`pnpm
  // typecheck`) already gates `deploy` on that passing before the
  // self-hosted runner's slower Docker build even starts (`deploy:
  // needs: verify` in .github/workflows/deploy.yml). Skipping the
  // redundant pass here shaves a few minutes off every production
  // build without weakening the check — a type error never reaches
  // this step in the first place.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
