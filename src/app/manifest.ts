import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  return {
    name: settings.siteTitle,
    short_name: "Photography",
    description: "A photography portfolio.",
    start_url: "/",
    display: "standalone",
    // Portfolio tokens (src/app/globals.css) — the fixed black/paper/red
    // identity, not the admin theme. background_color is what shows as the
    // splash screen background while the app is loading.
    background_color: "#f8f7f5",
    theme_color: "#111111",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
