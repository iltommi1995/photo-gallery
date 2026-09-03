import Image from "next/image";

type AlbumHeroProps = {
  title: string;
  coverPhoto: { id: string; altText: string | null; blurDataUrl: string | null } | null;
};

export function AlbumHero({ title, coverPhoto }: AlbumHeroProps) {
  return (
    <section
      data-scroll-section
      className="bg-portfolio-ink relative h-[60vh] w-full shrink-0 md:h-full md:w-screen"
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
      <h1 className="font-portfolio-heading text-portfolio-paper absolute bottom-10 left-6 text-4xl font-bold tracking-tight uppercase sm:text-6xl">
        {title}
      </h1>
    </section>
  );
}
