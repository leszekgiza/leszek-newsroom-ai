"use client";

import { useState } from "react";

type Step = "disclaimer" | "auth" | "connected" | "config";

interface TwitterConfig {
  timelineType: "following" | "for_you";
  maxTweets: number;
  includeRetweets: boolean;
  includeReplies: boolean;
  expandThreads: boolean;
}

export function TwitterWizard() {
  const [step, setStep] = useState<Step>("disclaimer");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Cookie auth
  const [authToken, setAuthToken] = useState("");
  const [ct0, setCt0] = useState("");

  // Login auth
  const [showLoginFallback, setShowLoginFallback] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Connected
  const [profileName, setProfileName] = useState<string | null>(null);

  // Config
  const [config, setConfig] = useState<TwitterConfig>({
    timelineType: "following",
    maxTweets: 50,
    includeRetweets: true,
    includeReplies: false,
    expandThreads: true,
  });
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Show cookie help
  const [showCookieHelp, setShowCookieHelp] = useState(false);

  const handleAuth = async (method: "cookies" | "login") => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const body: Record<string, unknown> = { disclaimerAccepted: true };
      if (method === "cookies") {
        body.authToken = authToken.trim();
        body.ct0 = ct0.trim();
      } else {
        body.username = username.trim();
        body.password = password;
      }

      const res = await fetch("/api/connectors/twitter/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Autoryzacja nie powiodła się");
      }

      setProfileName(data.username);
      setStep("connected");
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Wystąpił błąd"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/connectors/twitter/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      window.location.href = "/settings/integrations";
    } catch {
      // stay
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/connectors/twitter/disconnect", { method: "POST" });
      window.location.href = "/settings/integrations";
    } catch {
      setDisconnecting(false);
    }
  };

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={onChange}
      className={`w-12 h-7 rounded-full relative transition-colors ${
        value
          ? "bg-foreground"
          : "bg-muted/30 border border-border"
      }`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
          value ? "right-1" : "left-1"
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-5">
      {/* X Icon & Title */}
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto bg-black dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <svg
            className="w-8 h-8 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-foreground">
          Integracja X / Twitter
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importuj tweety i wątki z timeline&apos;u
        </p>
      </div>

      {/* DISCLAIMER */}
      {(step === "disclaimer" || step === "auth") && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                Ważne informacje
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 mt-2 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5">&bull;</span>
                  <span>
                    X/Twitter{" "}
                    <strong>ogranicza nieautoryzowany dostęp</strong>. Używamy
                    Twikit (scraper).
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5">&bull;</span>
                  <span>
                    Scraping narusza <strong>regulamin X</strong> i może
                    skutkować ograniczeniami konta.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5">&bull;</span>
                  <span>
                    Limit: <strong>600 tweetów / 15 min</strong> per konto.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5">&bull;</span>
                  <span>
                    Twoje cookies są <strong>szyfrowane (AES-256)</strong> i
                    nigdy nie opuszczają serwera.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <label className="flex items-start gap-3 pt-2 border-t border-amber-200 dark:border-amber-800 cursor-pointer">
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-200 mt-0.5"
            />
            <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              Rozumiem i akceptuję ryzyko związane ze scrapingiem X/Twitter
            </span>
          </label>
        </div>
      )}

      {step === "disclaimer" && (
        <button
          onClick={() => setStep("auth")}
          disabled={!disclaimerAccepted}
          className="w-full py-3.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
        >
          Kontynuuj
        </button>
      )}

      {/* AUTH: COOKIES (preferred) */}
      {step === "auth" && (
        <>
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              Cookies z przeglądarki
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium rounded-full">
                Zalecane
              </span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  auth_token
                </label>
                <input
                  type="password"
                  placeholder="Wklej auth_token z DevTools..."
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  ct0
                </label>
                <input
                  type="password"
                  placeholder="Wklej ct0 z DevTools..."
                  value={ct0}
                  onChange={(e) => setCt0(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCookieHelp(!showCookieHelp)}
              className="text-xs text-primary underline flex items-center gap-1"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Jak znaleźć cookies auth_token i ct0?
            </button>

            {showCookieHelp && (
              <div className="bg-muted/10 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                <p>1. Otwórz x.com w przeglądarce (zaloguj się)</p>
                <p>2. F12 → Application → Cookies → https://x.com</p>
                <p>
                  3. Znajdź <code className="bg-muted/20 px-1 rounded">auth_token</code> i{" "}
                  <code className="bg-muted/20 px-1 rounded">ct0</code>
                </p>
                <p>4. Skopiuj wartości i wklej powyżej</p>
              </div>
            )}

            <button
              onClick={() => handleAuth("cookies")}
              disabled={authLoading || !authToken.trim() || !ct0.trim()}
              className="w-full py-3 bg-foreground text-background font-medium rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Łączenie...
                </>
              ) : (
                "Połącz przez cookies"
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              lub (mniej stabilne)
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Login fallback */}
          <div className="bg-muted/5 rounded-2xl border border-border p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowLoginFallback(!showLoginFallback)}
              className="text-sm font-medium text-muted-foreground flex items-center gap-2 w-full"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showLoginFallback ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Login / hasło (fallback)
            </button>

            {showLoginFallback && (
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="@username lub email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
                <input
                  type="password"
                  placeholder="Hasło"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
                <button
                  onClick={() => handleAuth("login")}
                  disabled={authLoading || !username.trim() || !password}
                  className="w-full py-2.5 border border-border text-foreground font-medium rounded-xl hover:bg-muted/10 transition-colors text-sm disabled:opacity-50"
                >
                  Połącz przez login
                </button>
              </div>
            )}
          </div>

          {authError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">
              {authError}
            </p>
          )}
        </>
      )}

      {/* CONNECTION SUCCESS + CONFIG */}
      {step === "connected" && (
        <>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                  Połączono z X/Twitter
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Zalogowano jako {profileName || "X User"}.
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Config */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <h3 className="font-semibold text-foreground">
              Konfiguracja timeline&apos;u
            </h3>

            {/* Timeline type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Typ timeline&apos;u
              </label>
              <div className="flex gap-2">
                {(["following", "for_you"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, timelineType: type }))
                    }
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      config.timelineType === type
                        ? "bg-foreground text-background"
                        : "bg-muted/10 text-muted-foreground border border-border hover:bg-muted/20"
                    }`}
                  >
                    {type === "following" ? "Following" : "For You"}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Retweety
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Importuj retweety
                  </p>
                </div>
                <Toggle
                  value={config.includeRetweets}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      includeRetweets: !prev.includeRetweets,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Odpowiedzi
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Importuj odpowiedzi (replies)
                  </p>
                </div>
                <Toggle
                  value={config.includeReplies}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      includeReplies: !prev.includeReplies,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Rozwijaj wątki
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Łącz tweety z wątków w jeden artykuł
                  </p>
                </div>
                <Toggle
                  value={config.expandThreads}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      expandThreads: !prev.expandThreads,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex-1 py-3.5 bg-muted/10 text-foreground border border-border font-medium rounded-xl hover:bg-muted/20 transition-colors disabled:opacity-50"
            >
              {disconnecting ? "Rozłączanie..." : "Rozłącz"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </>
      )}

      {/* Cancel */}
      {step !== "connected" && (
        <div className="flex gap-3">
          <a
            href="/settings/integrations"
            className="flex-1 py-3.5 bg-muted/10 text-foreground border border-border font-medium rounded-xl hover:bg-muted/20 transition-colors text-center"
          >
            Anuluj
          </a>
        </div>
      )}
    </div>
  );
}
