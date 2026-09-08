import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: the dev server rejects HMR's websocket (and other requests)
  // from a host it doesn't recognize as "same origin as localhost" —
  // needed to test from a phone, whether via the LAN IP (port-forwarded
  // from Windows to WSL) or a cloudflared/localtunnel tunnel, whose
  // hostname is otherwise unknown to it and gets a 401 on /_next/hmr.
  allowedDevOrigins: ["192.168.1.78", "*.trycloudflare.com", "*.loca.lt"],
};

export default nextConfig;
