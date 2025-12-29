export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Reset hasła</h1>
          <p className="text-muted mt-2">
            Podaj email, na który wyślemy link do resetowania hasła
          </p>
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
          <button
            type="submit"
            className="w-full px-6 py-3 bg-primary text-card font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Wyślij link
          </button>
        </form>

        <p className="text-center text-muted mt-6">
          <a href="/login" className="text-accent hover:underline">
            Wróć do logowania
          </a>
        </p>
      </div>
    </div>
  );
}
