import { AdminGate } from "@/components/guards";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/admin-sidebar";

export const metadata = {
  title: "Admin",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGate>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden max-h-full w-60 shrink-0 self-start overflow-y-auto border-r md:block">
          <AdminSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <AdminMobileNav />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminGate>
  );
}
