import { SiteNav } from "@/components/public/SiteNav";
import { RotateDeviceNotice } from "@/components/public/RotateDeviceNotice";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-portfolio-grain text-portfolio-ink min-h-dvh">
      <RotateDeviceNotice />
      <SiteNav />
      <div className="portfolio-content min-w-0">{children}</div>
    </div>
  );
}
