import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/admin/SignOutButton";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-sm font-medium">Photo Gallery Admin</span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
