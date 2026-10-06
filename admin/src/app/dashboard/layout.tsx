import { AdminSidebar } from "@/components/admin-sidebar";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl p-8">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
