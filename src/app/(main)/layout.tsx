export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      {/* TODO: Add Navbar and BottomNav */}
      <main>{children}</main>
    </div>
  );
}
