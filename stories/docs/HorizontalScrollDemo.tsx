"use client";

import { useHorizontalScroll } from "@/lib/scroll/useHorizontalScroll";

const SECTIONS = [
  { label: "Hero", hue: 220 },
  { label: "2018", hue: 20 },
  { label: "Night", hue: 260 },
  { label: "Streets", hue: 140 },
];

/**
 * A minimal, self-contained stand-in for AlbumScrollView — same hook, same
 * container classes, colored boxes instead of real photos — so this page
 * demonstrates the actual wheel/keyboard mechanics without depending on a
 * running database.
 */
export function HorizontalScrollDemo() {
  const { containerRef, progress } = useHorizontalScroll();

  return (
    <div style={{ border: "1px solid #8883", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ height: 4, background: "#8882" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.round(progress * 100)}%`,
            background: "#c0392b",
            transition: "width 75ms linear",
          }}
        />
      </div>
      <div
        ref={containerRef}
        tabIndex={0}
        style={{
          display: "flex",
          height: 260,
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
        }}
      >
        {SECTIONS.map((s) => (
          <section
            key={s.label}
            data-scroll-section
            style={{
              flex: "0 0 100%",
              scrollSnapAlign: "start",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "monospace",
              fontSize: 20,
              color: "white",
              background: `hsl(${s.hue} 40% 35%)`,
            }}
          >
            {s.label}
          </section>
        ))}
      </div>
    </div>
  );
}
