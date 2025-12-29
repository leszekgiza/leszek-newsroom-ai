export default function SavedPage() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-card pb-24">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-primary">Zapisane</h1>
        </div>
      </header>

      <div className="p-4">
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-muted mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <p className="text-muted">Brak zapisanych artykułów</p>
        </div>
      </div>
    </div>
  );
}
