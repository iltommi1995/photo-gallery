"use client";

import { useEffect, useState } from "react";
import { RotateCcwIcon, XIcon } from "lucide-react";

// Anything narrower than a small tablet, held in portrait — a genuine
// phone-in-your-hand case, not a resized desktop window (those are
// virtually always landscape) or a portrait tablet (wide enough that the
// gallery-wide grid still reads fine).
const SHOULD_SHOW_QUERY = "(orientation: portrait) and (max-width: 900px)";
const DISMISS_KEY = "rotate-device-notice-dismissed";

/**
 * Suggests landscape orientation, site-wide (rendered once in the public
 * layout) — the horizontal-scroll album/place view is where it matters
 * most (portrait forces a real fallback, vertical stacking instead of the
 * "photo album" scroll — see the `gallery-wide` custom variant in
 * globals.css), but showing it everywhere means it's there from the first
 * page a visitor lands on, not just once they open an album. Dismissing it
 * is remembered for the tab's session; it also just disappears on its own
 * once the phone is actually rotated.
 */
export function RotateDeviceNotice() {
  const [shouldShow, setShouldShow] = useState(false);
  // Lazy initializer (runs once, on mount) rather than an effect + setState:
  // this is read-only-once state, not something synchronizing with an
  // external system on every change. Defaults to "dismissed" during SSR,
  // where there's no sessionStorage — matches shouldShow's SSR default of
  // false, so the server and first client paint agree (hidden either way).
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const mql = window.matchMedia(SHOULD_SHOW_QUERY);
    const update = () => setShouldShow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  if (!shouldShow || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private-mode/storage-disabled browsers just won't remember it.
    }
  }

  return (
    <div
      data-rotate-notice
      className="prose-portfolio-text bg-portfolio-grain text-portfolio-ink fixed inset-x-0 top-0 z-[70] flex items-center gap-3 border-b border-black/10 px-4 py-3 text-xs"
    >
      <RotateCcwIcon className="text-portfolio-accent size-5 shrink-0" aria-hidden />
      <p className="flex-1">For the best experience, rotate your phone to landscape.</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-portfolio-accent hover:opacity-70 shrink-0"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
