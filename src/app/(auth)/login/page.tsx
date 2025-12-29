export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-white"
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
          <h1 className="text-2xl font-bold text-primary">Newsroom AI</h1>
          <p className="text-muted mt-2">Zaloguj się do swojego konta</p>
        </div>

        <form className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-primary mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="twoj@email.pl"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-primary mb-1"
            >
              Hasło
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end">
            <a
              href="/reset-password"
              className="text-sm text-accent hover:underline"
            >
              Zapomniałeś hasła?
            </a>
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 bg-primary text-card font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Zaloguj się
          </button>
        </form>

        <p className="text-center text-muted mt-6">
          Nie masz konta?{" "}
          <a href="/register" className="text-accent hover:underline">
            Zarejestruj się
          </a>
        </p>
      </div>
    </div>
  );
}
