import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Sidebar - visible on lg: screens */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:ml-64 min-h-screen">
        {/* Mobile/Tablet Navbar - hidden on lg: */}
        <div className="lg:hidden">
          <Navbar />
        </div>

        {/* Main Content */}
        <main className="pb-20 lg:pb-0">{children}</main>

        {/* Mobile Bottom Nav - hidden on md: and above */}
        <BottomNav />
      </div>
    </div>
  );
}
