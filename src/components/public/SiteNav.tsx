"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Me" },
  { href: "/places", label: "Places" },
  { href: "/albums", label: "Albums" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Single fixed toggle — its icon morphs between hamburger and X
          rather than swapping to a second, differently-positioned button.
          z-[60] keeps it above the dialog overlay (z-50) so it stays the
          one control for both opening and closing. Top-left corner on
          portrait mobile (a vertically-centered button reads as "the start
          of the horizontal scroll" — a relationship that only exists in
          the gallery-wide layout); left-center, matching that scroll-start
          edge, once gallery-wide's horizontal album/place view applies.
          globals.css pushes it down further while RotateDeviceNotice is
          showing, so the two don't overlap. */}
      <button
        type="button"
        data-site-nav-toggle
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="text-portfolio-accent hover:opacity-70 fixed top-6 left-6 z-[60] cursor-pointer gallery-wide:top-1/2 gallery-wide:-translate-y-1/2"
      >
        <span className="relative block size-10">
          <MenuIcon
            className={cn(
              "absolute inset-0 size-10 transition-[opacity,rotate] duration-250 ease-out motion-reduce:transition-none",
              open ? "rotate-90 opacity-0" : "rotate-0 opacity-100",
            )}
          />
          <XIcon
            className={cn(
              "absolute inset-0 size-10 transition-[opacity,rotate] duration-250 ease-out motion-reduce:transition-none",
              open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0",
            )}
          />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          fullscreen
          showCloseButton={false}
          overlayClassName="bg-portfolio-overlay supports-backdrop-filter:backdrop-blur-none transition-opacity duration-250 ease-out data-open:animate-none data-closed:animate-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"
          className="flex flex-col justify-center gap-0 p-0 transition-opacity duration-250 ease-out data-open:animate-none data-closed:animate-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"
        >
          <DialogTitle className="sr-only">Site menu</DialogTitle>
          <nav className="flex flex-col gap-6 pl-[var(--portfolio-menu-rail)] pr-6 gallery-short:gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-portfolio-heading text-portfolio-accent text-4xl font-bold tracking-tight uppercase hover:opacity-80 sm:text-6xl gallery-short:text-2xl"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
