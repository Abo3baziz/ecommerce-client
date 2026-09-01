import { AdminGate } from "@/components/guards";
import { AdminMobileNav, AdminSidebar } from "@/components/layout/admin-sidebar";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGate>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
          <AdminSidebar />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AdminMobileNav />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 min-w-0">{children}</main>
        </div>
      </div>
    </AdminGate>
  );
}
