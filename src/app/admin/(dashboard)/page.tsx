import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Album and photo management lands here in a later phase.
      </p>
    </div>
  );
}
