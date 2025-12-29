import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-md mx-auto bg-card min-h-screen relative pb-20 md:pb-0">
        <Navbar />
        <main>{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
