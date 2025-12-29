export default function HomePage() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-card">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
            <span className="font-bold text-primary text-lg">Newsroom AI</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Witaj w Newsroom AI
          </h1>
          <p className="text-muted mb-8">
            Twój osobisty agregator newsów z AI-generowanymi streszczeniami.
          </p>
          <div className="flex flex-col gap-4 max-w-xs mx-auto">
            <a
              href="/login"
              className="px-6 py-3 bg-primary text-card font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Zaloguj się
            </a>
            <a
              href="/register"
              className="px-6 py-3 border border-border text-primary font-medium rounded-xl hover:bg-surface transition-colors"
            >
              Zarejestruj się
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
