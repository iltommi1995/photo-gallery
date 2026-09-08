"use client";

import { useEffect, useRef } from "react";

import { GALLERY_WIDE_QUERY } from "@/lib/scroll/breakpoints";

const LERP_FACTOR = 0.15;
const SCROLL_EPSILON = 0.5;

/** Continuous desktop X scrolling from vertical wheel input; horizontal
 * trackpad input and the mobile vertical layout keep their native behavior. */
export function useHorizontalScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = () => window.matchMedia(GALLERY_WIDE_QUERY).matches;

    // Start at the cover. No snap points or delayed section alignment.
    container.scrollLeft = 0;
    targetRef.current = 0;

    // Update the indicator in the same frame as scrollLeft, without waiting
    // for React to render the entire gallery during continuous wheel input.
    function updateProgress(c: HTMLDivElement) {
      const max = c.scrollWidth - c.clientWidth;
      const progress = max > 0 ? Math.min(1, Math.max(0, c.scrollLeft / max)) : 0;
      if (progressFillRef.current)
        progressFillRef.current.style.transform = `scaleX(${progress})`;
      progressBarRef.current?.setAttribute(
        "aria-valuenow",
        String(Math.round(progress * 100)),
      );
    }
    updateProgress(container);

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
        if (Math.abs(diff) < SCROLL_EPSILON) {
          c.scrollLeft = targetRef.current;
          updateProgress(c);
          rafRef.current = null;
          return;
        }
        c.scrollLeft += Math.sign(diff) * Math.max(1, Math.abs(diff) * LERP_FACTOR);
        updateProgress(c);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }

    function onWheel(event: WheelEvent) {
      const c = containerRef.current;
      if (!c || !isDesktop() || event.ctrlKey) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        stopLoop();
        targetRef.current = c.scrollLeft;
        return; // Native horizontal input takes over from wheel easing.
      }
      event.preventDefault();
      const max = c.scrollWidth - c.clientWidth;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? c.clientWidth : 1;
      targetRef.current = Math.min(
        max,
        Math.max(0, targetRef.current + event.deltaY * unit),
      );
      if (reducedMotion) {
        c.scrollLeft = targetRef.current;
        updateProgress(c);
      } else startLoop();
    }

    function onScroll() {
      const c = containerRef.current;
      if (!c) return;
      updateProgress(c);
      if (rafRef.current === null) targetRef.current = c.scrollLeft;
    }

    function onKeyDown(event: KeyboardEvent) {
      const c = containerRef.current;
      if (!c || !isDesktop()) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName))
      )
        return;
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const max = c.scrollWidth - c.clientWidth;
      const step = c.clientWidth * 0.15;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? max
            : Math.max(
                0,
                Math.min(max, c.scrollLeft + (event.key === "ArrowRight" ? step : -step)),
              );
      stopLoop();
      targetRef.current = next;
      c.scrollTo({ left: next, behavior: reducedMotion ? "auto" : "smooth" });
    }

    const resizeObserver = new ResizeObserver(() => updateProgress(container));
    resizeObserver.observe(container);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("keydown", onKeyDown);
    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("keydown", onKeyDown);
      stopLoop();
    };
  }, []);

  return { containerRef, progressBarRef, progressFillRef };
}
