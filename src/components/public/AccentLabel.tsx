import { cn } from "@/lib/utils";

type AccentLabelProps = {
  children: React.ReactNode;
  as?: "span" | "h2" | "h3";
  className?: string;
};

/**
 * The small red label used throughout the public site for place names
 * (under an album cover) and chapter markers (e.g. a year, "2018").
 */
export function AccentLabel({ children, as: Tag = "span", className }: AccentLabelProps) {
  return (
    <Tag
      className={cn(
        "font-portfolio-heading text-portfolio-accent text-lg font-bold tracking-wide",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
