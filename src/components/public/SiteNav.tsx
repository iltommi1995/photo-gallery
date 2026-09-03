"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon, XIcon } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Me" },
  { href: "/places", label: "Places" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="border-portfolio-accent text-portfolio-accent hover:bg-portfolio-accent/10 fixed top-6 left-6 z-50 rounded border p-2"
      >
        <MenuIcon className="size-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="bg-portfolio-overlay flex h-screen max-h-screen w-screen max-w-none flex-col justify-center gap-0 rounded-none border-none p-0"
        >
          <DialogTitle className="sr-only">Site menu</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="border-portfolio-accent text-portfolio-accent hover:bg-portfolio-accent/10 absolute top-6 left-6 rounded border p-2"
          >
            <XIcon className="size-5" />
          </button>
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
