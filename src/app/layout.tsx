import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bebas_Neue, Courier_Prime } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tall, condensed display face for hero/album titles and nav — the
// editorial-magazine-masthead look, distinct from the admin's plain sans.
// Bebas Neue ships one weight (400) by design; it reads as bold on its own,
// so an explicit `font-bold` alongside it is harmless but redundant.
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});

// Typewriter face for text-block placements (ChapterMosaic, the admin
// canvas preview, and the Tiptap editor surface) — see .prose-portfolio-text
// in globals.css, the single place it's applied.
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Photography",
    template: "%s — Photography",
  },
  description: "A photography portfolio.",
  openGraph: {
    type: "website",
    siteName: "Photography",
  },
  // iOS ignores the web manifest's icons/display mode — Safari reads these
  // meta tags instead for "Add to Home Screen" (apple-icon.tsx supplies the
  // icon itself). Android/Chrome-family browsers use manifest.ts.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Photography",
  },
};

// Separate from `metadata` per Next's viewport API — themeColor tints the
// browser/OS chrome (status bar, task switcher) to match the portfolio's
// fixed ink black, both installed and in a regular browser tab.
export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
