"use client";

import { useEffect, useState } from "react";

// Matches the `gallery-wide` custom variant in globals.css — landscape
// orientation AND real width, not just "wide enough". A rotated phone
// qualifies same as a desktop window; a portrait phone (any width) doesn't.
// Shared by useHorizontalScroll (wheel-input detection) and
// useDeviceContext (which of a chapter's three placement lists renders) so
// the CSS breakpoint and its JS equivalents can never drift apart.
export const GALLERY_WIDE_QUERY = "(orientation: landscape) and (min-width: 640px)";

// Matches the `gallery-short` custom variant in globals.css — landscape AND
// short enough to be a rotated phone, not a real desktop window (which is
// virtually never this short). A SUBSET of gallery-wide, not its opposite:
// a landscape phone satisfies both.
const GALLERY_SHORT_QUERY = "(orientation: landscape) and (max-height: 500px)";

function useMatches(query: string, defaultValue: boolean) {
  const [matches, setMatches] = useState(defaultValue);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
    // query is a module-level constant at every call site, never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return matches;
}

export type DeviceContext = "desktop" | "mobile-landscape" | "mobile-portrait";

/** Which of a chapter's three placement lists (Web, Mobile landscape,
 * Mobile portrait — see AlbumScrollView's ScrollChapter) applies right now.
 * "desktop" is gallery-wide AND NOT gallery-short (a real desktop window,
 * virtually never this short); "mobile-landscape" is a rotated phone
 * (gallery-wide AND gallery-short); "mobile-portrait" is everything else
 * (not gallery-wide at all). Reactive to orientation/resize changes (a
 * phone rotating mid-session).
 *
 * Defaults to "desktop" during SSR and until the first client effect
 * runs — for a list with no override this is moot (the corresponding
 * CSS-only path renders correctly either way); for one with an override, a
 * mobile visitor's first paint briefly shows the desktop/web mosaic before
 * swapping to the curated set post-mount, the same accepted hydration-flash
 * trade-off RotateDeviceNotice.tsx already uses. Defaulting to a mobile
 * context would be worse: SSR/ISR-cached HTML and non-JS crawlers would see
 * a mobile-only set instead of the canonical desktop one. */
export function useDeviceContext(): DeviceContext {
  const isGalleryWide = useMatches(GALLERY_WIDE_QUERY, true);
  const isGalleryShort = useMatches(GALLERY_SHORT_QUERY, false);
  if (!isGalleryWide) return "mobile-portrait";
  return isGalleryShort ? "mobile-landscape" : "desktop";
}
