"use client";

import { useEffect, useRef, useState } from "react";

const DESKTOP_QUERY = "(min-width: 768px)";
const LERP_FACTOR = 0.15;
const SNAP_EPSILON = 0.5;
const SETTLE_WINDOW_MS = 1000;

/**
 * Drives the desktop horizontal-scroll album track: remaps vertical mouse
 * wheel input (deltaY) onto the X axis with inertial easing, while letting
 * native trackpad horizontal scroll (deltaX) and touch scroll pass through
 * untouched. Below the md breakpoint this is a no-op — the container is a
 * normal vertical flow there (see AlbumScrollView), so nothing here should
 * fight mobile scrolling.
 */
export function useHorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

    // Chromium re-resolves `scroll-snap-type: x mandatory` as chapter images
    // load and shift layout, and can land on the second section instead of
    // the first — repeatedly, across several frames, so forcibly resetting
    // scrollLeft loses a same-frame race against the browser's own
    // re-snapping every time. Instead, remove the snap type entirely for a
    // short window after mount (nothing to incorrectly snap to), then
    // restore it — either once things settle, or immediately on the
    // visitor's first real interaction.
    container.style.scrollSnapType = "none";
    container.scrollLeft = 0;
    let settling = true;
    const settleTimer: ReturnType<typeof setTimeout> = setTimeout(() => {
      settling = false;
      // `container` is narrowed non-null above, but TS doesn't carry that
      // through this closure — it's the same stable ref throughout the effect.
      container!.style.scrollSnapType = "";
    }, SETTLE_WINDOW_MS);

    function stopSettling() {
      if (!settling) return;
      settling = false;
      clearTimeout(settleTimer);
      // `container` is narrowed non-null above, but TS doesn't carry that
      // through this closure — it's the same stable ref throughout the effect.
      container!.style.scrollSnapType = "";
    }

    targetRef.current = 0;

    function stopLoop() {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    function startLoop() {
      if (rafRef.current !== null) return;
      const step = () => {
        const c = containerRef.current;
        if (!c) {
          rafRef.current = null;
          return;
        }
        const diff = targetRef.current - c.scrollLeft;
        if (Math.abs(diff) < SNAP_EPSILON) {
          c.scrollLeft = targetRef.current;
          rafRef.current = null;
          return;
        }
        c.scrollLeft += diff * LERP_FACTOR;
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    function onWheel(event: WheelEvent) {
      const c = containerRef.current;
      if (!c || !isDesktop()) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return; // native horizontal input
      stopSettling();
      event.preventDefault();
      const max = c.scrollWidth - c.clientWidth;
      targetRef.current = Math.min(max, Math.max(0, targetRef.current + event.deltaY));
      if (reducedMotion) {
        c.scrollLeft = targetRef.current;
      } else {
        startLoop();
      }
    }

    function onScroll() {
      const c = containerRef.current;
      if (!c) return;
      const max = c.scrollWidth - c.clientWidth;
      setProgress(max > 0 ? c.scrollLeft / max : 0);
      if (rafRef.current === null) targetRef.current = c.scrollLeft;
    }

    function sectionOffsets() {
      const c = containerRef.current;
      if (!c) return [];
      return Array.from(c.querySelectorAll<HTMLElement>("[data-scroll-section]")).map(
        (el) => el.offsetLeft,
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      const c = containerRef.current;
      if (!c || !isDesktop()) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(active.tagName))
        return;
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;

      stopSettling();
      event.preventDefault();
      const current = c.scrollLeft;
      const max = c.scrollWidth - c.clientWidth;
      let next = current;

      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = max;
      else {
        const offsets = sectionOffsets();
        if (event.key === "ArrowRight") {
          next = offsets.find((o) => o > current + 5) ?? max;
        } else {
          next = [...offsets].reverse().find((o) => o < current - 5) ?? 0;
        }
      }

      targetRef.current = next;
      c.scrollTo({ left: next, behavior: reducedMotion ? "auto" : "smooth" });
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("keydown", onKeyDown);

    return () => {
      stopSettling();
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("keydown", onKeyDown);
      stopLoop();
    };
  }, []);

  return { containerRef, progress };
}
