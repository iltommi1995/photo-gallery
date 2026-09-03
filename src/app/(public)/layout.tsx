import { SiteNav } from "@/components/public/SiteNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-portfolio-paper text-portfolio-ink min-h-full">
      <SiteNav />
      {children}
    </div>
  );
}
