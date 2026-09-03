type HorizontalScrollProgressProps = {
  progress: number;
};

export function HorizontalScrollProgress({ progress }: HorizontalScrollProgressProps) {
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  return (
    <div
      className="bg-portfolio-ink/10 fixed inset-x-0 top-0 z-40 hidden h-1 md:block"
      role="progressbar"
      aria-label="Album scroll position"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="bg-portfolio-accent h-full transition-[width] duration-75 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
