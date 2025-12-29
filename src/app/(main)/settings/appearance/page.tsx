export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-card pb-24">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <a href="/settings" className="text-primary">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </a>
          <h1 className="text-xl font-bold text-primary">Wygląd</h1>
        </div>
      </header>

      <div className="p-4">
        <p className="text-muted text-center py-8">
          Ustawienia wyglądu - w trakcie implementacji
        </p>
      </div>
    </div>
  );
}
