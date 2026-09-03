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
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Single fixed toggle, left-center — its icon morphs between hamburger
          and X rather than swapping to a second, differently-positioned
          button. z-[60] keeps it above the dialog overlay (z-50) so it stays
          the one control for both opening and closing. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="text-portfolio-accent hover:opacity-70 fixed top-1/2 left-6 z-[60] -translate-y-1/2 cursor-pointer"
      >
        <span className="relative block size-8">
          <MenuIcon
            className={cn(
              "absolute inset-0 size-8 transition-all duration-300 ease-in-out",
              open ? "rotate-90 opacity-0" : "rotate-0 opacity-100",
            )}
          />
          <XIcon
            className={cn(
              "absolute inset-0 size-8 transition-all duration-300 ease-in-out",
              open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0",
            )}
          />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="bg-portfolio-overlay top-0 left-0 flex h-screen max-h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col justify-center gap-0 rounded-none border-none p-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">Site menu</DialogTitle>
          <nav className="flex flex-col gap-6 pl-10 sm:pl-20">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-portfolio-heading text-portfolio-accent text-4xl font-bold tracking-tight uppercase hover:opacity-80 sm:text-6xl"
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
