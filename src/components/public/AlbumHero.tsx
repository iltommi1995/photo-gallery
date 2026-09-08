import Image from "next/image";
import { Anton } from "next/font/google";

// Same display face and treatment as the home hero title
// (src/app/(public)/page.tsx) — loaded here too rather than shared via a
// design token, matching how the home hero already does it.
const heroFont = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

type AlbumHeroProps = {
  title: string;
  coverPhoto: { id: string; altText: string | null; blurDataUrl: string | null } | null;
};

export function AlbumHero({ title, coverPhoto }: AlbumHeroProps) {
  return (
    <section
      data-scroll-section
      className="bg-portfolio-ink relative h-dvh w-full shrink-0 gallery-wide:h-full"
    >
      {coverPhoto && (
        <Image
          src={`/api/media/${coverPhoto.id}/full`}
          alt={coverPhoto.altText ?? ""}
          fill
          placeholder={coverPhoto.blurDataUrl ? "blur" : undefined}
          blurDataURL={coverPhoto.blurDataUrl ?? undefined}
          sizes="100vw"
          priority
          className="object-cover"
        />
      )}
      <div className="from-portfolio-overlay absolute inset-0 bg-gradient-to-t to-transparent" />
      <h1
        className={`${heroFont.className} text-portfolio-accent absolute right-6 bottom-10 text-right font-normal uppercase sm:right-16 sm:bottom-16 gallery-short:bottom-4`}
      >
        <span className="block text-[clamp(1.75rem,5vw,7rem)] leading-none tracking-[-0.03em] [overflow-wrap:anywhere] gallery-short:text-[clamp(1.5rem,10vh,3.5rem)]">
          {title}
        </span>
      </h1>
    </section>
  );
}
