import type { Ref } from "react";

type HorizontalScrollProgressProps = {
  progress?: number;
  progressBarRef?: Ref<HTMLDivElement>;
  progressFillRef?: Ref<HTMLDivElement>;
};

export function HorizontalScrollProgress({
  progress = 0,
  progressBarRef,
  progressFillRef,
}: HorizontalScrollProgressProps) {
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  return (
    <div
      className="bg-portfolio-ink/10 fixed inset-x-0 top-0 z-40 hidden h-1 gallery-wide:block"
      ref={progressBarRef}
      role="progressbar"
      aria-label="Album scroll position"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        ref={progressFillRef}
        className="bg-portfolio-accent h-full w-full origin-left"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}
