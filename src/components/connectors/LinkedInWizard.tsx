"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Step =
  | "disclaimer"
  | "auth"
  | "authenticating"
  | "2fa"
  | "captcha"
  | "connected"
  | "config";

type ChallengeType =
  | "2fa_email"
  | "2fa_sms"
  | "2fa_app"
  | "2fa_unknown";

interface LinkedInConfig {
  hashtags: string[];
  maxPosts: number;
  includeReposts: boolean;
}

const CHALLENGE_MESSAGES: Record<ChallengeType, string> = {
  "2fa_email": "LinkedIn wysłał kod weryfikacyjny na Twój email",
  "2fa_sms": "LinkedIn wysłał SMS z kodem weryfikacyjnym",
  "2fa_app": "Otwórz aplikację uwierzytelniającą i wpisz kod",
  "2fa_unknown": "LinkedIn wymaga weryfikacji dwuetapowej",
};

const SESSION_TTL_SECONDS = 300; // 5 min

export function LinkedInWizard() {
  const [step, setStep] = useState<Step>("disclaimer");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Auth
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [liAt, setLiAt] = useState("");
  const [showCookieFallback, setShowCookieFallback] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Browser auth / 2FA
  const [browserSessionId, setBrowserSessionId] = useState<string | null>(null);
  const [challengeType, setChallengeType] = useState<ChallengeType | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [captchaScreenshot, setCaptchaScreenshot] = useState<string | null>(null);
  const [timeoutSeconds, setTimeoutSeconds] = useState(SESSION_TTL_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connected state
  const [profileName, setProfileName] = useState<string | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);

  // Config
  const [config, setConfig] = useState<LinkedInConfig>({
    hashtags: [],
    maxPosts: 30,
    includeReposts: false,
  });
  const [hashtagInput, setHashtagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Disconnect
  const [disconnecting, setDisconnecting] = useState(false);

  // Countdown timer for 2FA
  const startCountdown = useCallback(() => {
    setTimeoutSeconds(SESSION_TTL_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeoutSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Close browser session on timeout
  useEffect(() => {
    if (timeoutSeconds === 0 && browserSessionId && step === "2fa") {
      fetch("/api/connectors/linkedin/browser-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: browserSessionId, code: "" }),
      }).catch(() => {});
      setVerifyError("Sesja wygasła. Spróbuj ponownie.");
      setBrowserSessionId(null);
    }
  }, [timeoutSeconds, browserSessionId, step]);

  const handleAuth = async (method: "login" | "cookie") => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (method === "cookie") {
        // Cookie fallback - use existing auth endpoint
        const res = await fetch("/api/connectors/linkedin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disclaimerAccepted: true, liAt: liAt.trim() }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Autoryzacja nie powiodła się");
        }

        setProfileName(data.profileName);
        setStep("connected");
        return;
      }

      // Browser-based login
      setStep("authenticating");

      const res = await fetch("/api/connectors/linkedin/browser-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disclaimerAccepted: true,
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setProfileName(data.profileName);
        setStep("connected");

        // Test connection to get post count
        try {
          const testRes = await fetch("/api/connectors/linkedin/test", {
            method: "POST",
          });
          const testData = await testRes.json();
          if (testData.success) {
            setPostCount(testData.postCount || null);
          }
        } catch {
          // Non-critical
        }
        return;
      }

      // 2FA required
      if (data.state?.startsWith("2fa")) {
        setBrowserSessionId(data.sessionId);
        setChallengeType(data.state as ChallengeType);
        setStep("2fa");
        startCountdown();
        return;
      }

      // CAPTCHA
      if (data.state === "captcha") {
        setCaptchaScreenshot(data.screenshot || null);
        setStep("captcha");
        return;
      }

      // Failed
      setStep("auth");
      throw new Error(data.error || "Logowanie nie powiodło się");
    } catch (err) {
      if (step === "authenticating") setStep("auth");
      setAuthError(
        err instanceof Error ? err.message : "Wystąpił błąd"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!browserSessionId || !verifyCode.trim()) return;

    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/connectors/linkedin/browser-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: browserSessionId,
          code: verifyCode.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (timerRef.current) clearInterval(timerRef.current);
        setProfileName(data.profileName);
        setStep("connected");
        return;
      }

      // Still on 2FA (wrong code)
      if (data.state?.startsWith("2fa")) {
        setVerifyError("Nieprawidłowy kod. Spróbuj ponownie.");
        setVerifyCode("");
        return;
      }

      // Failed
      if (timerRef.current) clearInterval(timerRef.current);
      setVerifyError(data.error || "Weryfikacja nie powiodła się");
      setBrowserSessionId(null);
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Wystąpił błąd"
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !config.hashtags.includes(tag)) {
      setConfig((prev) => ({
        ...prev,
        hashtags: [...prev.hashtags, tag],
      }));
    }
    setHashtagInput("");
  };

  const handleRemoveHashtag = (tag: string) => {
    setConfig((prev) => ({
      ...prev,
      hashtags: prev.hashtags.filter((h) => h !== tag),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/connectors/linkedin/config", {
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
      // stay on page
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/connectors/linkedin/disconnect", { method: "POST" });
      window.location.href = "/settings/integrations";
    } catch {
      setDisconnecting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-5">
      {/* LinkedIn Icon & Title */}
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto bg-[#0A66C2] rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <svg
            className="w-8 h-8 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-foreground">
          Integracja LinkedIn
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importuj posty z Twojego feeda LinkedIn
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
                    LinkedIn <strong>nie oferuje oficjalnego API</strong> do
                    odczytu feeda. Używamy nieoficjalnego Voyager API.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5">&bull;</span>
                  <span>
                    Scraping narusza{" "}
                    <strong>regulamin LinkedIn (ToS)</strong> i może skutkować
                    ograniczeniami lub banem konta.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5">&bull;</span>
                  <span>
                    Twoje dane logowania są{" "}
                    <strong>szyfrowane (AES-256)</strong> i nigdy nie opuszczają
                    tego serwera.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5">&bull;</span>
                  <span>Możesz odłączyć LinkedIn w każdej chwili.</span>
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
              Rozumiem i akceptuję ryzyko związane z nieoficjalnym dostępem do
              LinkedIn
            </span>
          </label>
        </div>
      )}

      {/* Continue to auth */}
      {step === "disclaimer" && (
        <button
          onClick={() => setStep("auth")}
          disabled={!disclaimerAccepted}
          className="w-full py-3.5 bg-[#0A66C2] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Kontynuuj
        </button>
      )}

      {/* AUTH FORM */}
      {step === "auth" && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#0A66C2]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Dane logowania
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Email / login LinkedIn
              </label>
              <input
                type="email"
                placeholder="twoj@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/20 focus:border-[#0A66C2]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Hasło LinkedIn
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/20 focus:border-[#0A66C2]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleAuth("login")}
            disabled={authLoading || !email.trim() || !password}
            className="w-full py-3 bg-[#0A66C2] text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {authLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Łączenie...
              </>
            ) : (
              "Połącz z LinkedIn"
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">lub</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Cookie fallback */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCookieFallback(!showCookieFallback)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showCookieFallback ? "rotate-90" : ""}`}
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
              Wklej cookie li_at z przeglądarki (zaawansowane)
            </button>

            {showCookieFallback && (
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Wklej cookie li_at..."
                  value={liAt}
                  onChange={(e) => setLiAt(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/20 focus:border-[#0A66C2]"
                />
                <button
                  onClick={() => handleAuth("cookie")}
                  disabled={authLoading || !liAt.trim()}
                  className="w-full py-2.5 border border-[#0A66C2] text-[#0A66C2] font-medium rounded-xl hover:bg-[#0A66C2]/5 transition-colors text-sm disabled:opacity-50"
                >
                  Połącz przez cookie
                </button>
              </div>
            )}
          </div>

          {authError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">
              {authError}
            </p>
          )}
        </div>
      )}

      {/* AUTHENTICATING SPINNER */}
      {step === "authenticating" && (
        <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-3 border-[#0A66C2] border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="font-semibold text-foreground">
              Logowanie do LinkedIn...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              To może potrwać do 15 sekund.
            </p>
          </div>
        </div>
      )}

      {/* 2FA VERIFICATION */}
      {step === "2fa" && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          {/* Challenge info banner */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-300 text-sm">
                  Weryfikacja dwuetapowa
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                  {challengeType
                    ? CHALLENGE_MESSAGES[challengeType]
                    : "LinkedIn wymaga dodatkowej weryfikacji"}
                </p>
              </div>
            </div>
          </div>

          {/* Code input */}
          <div className="text-center space-y-3">
            <label className="text-xs font-medium text-muted-foreground block">
              Kod weryfikacyjny
            </label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) =>
                setVerifyCode(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="000000"
              maxLength={8}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleVerify2FA()}
              className="w-48 mx-auto block px-4 py-3 bg-muted/10 border border-border rounded-xl text-center text-2xl font-mono tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/20 focus:border-[#0A66C2]"
            />

            {/* Countdown */}
            <p
              className={`text-xs ${
                timeoutSeconds <= 60
                  ? "text-red-500"
                  : "text-muted-foreground"
              }`}
            >
              Pozostało: {formatTime(timeoutSeconds)}
            </p>
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify2FA}
            disabled={
              verifyLoading ||
              !verifyCode.trim() ||
              !browserSessionId ||
              timeoutSeconds === 0
            }
            className="w-full py-3 bg-[#0A66C2] text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {verifyLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Weryfikacja...
              </>
            ) : (
              "Zweryfikuj"
            )}
          </button>

          {verifyError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl">
              {verifyError}
            </p>
          )}

          {/* Fallback to retry */}
          {(timeoutSeconds === 0 || !browserSessionId) && (
            <button
              onClick={() => {
                setStep("auth");
                setVerifyCode("");
                setVerifyError(null);
                setBrowserSessionId(null);
                setChallengeType(null);
              }}
              className="w-full py-2.5 border border-border text-foreground font-medium rounded-xl hover:bg-muted/10 transition-colors text-sm"
            >
              Powrót do logowania
            </button>
          )}
        </div>
      )}

      {/* CAPTCHA FALLBACK */}
      {step === "captcha" && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">
              LinkedIn wyświetlił CAPTCHA
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Automatyczne logowanie nie jest możliwe. Użyj metody z cookie
              li_at.
            </p>
          </div>

          {captchaScreenshot && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src={`data:image/png;base64,${captchaScreenshot}`}
                alt="CAPTCHA screenshot"
                className="w-full"
              />
            </div>
          )}

          <button
            onClick={() => {
              setStep("auth");
              setShowCookieFallback(true);
              setCaptchaScreenshot(null);
              setAuthError(null);
            }}
            className="w-full py-3 bg-[#0A66C2] text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Wklej cookie li_at
          </button>

          <button
            onClick={() => {
              setStep("auth");
              setCaptchaScreenshot(null);
              setAuthError(null);
            }}
            className="w-full py-2.5 border border-border text-foreground font-medium rounded-xl hover:bg-muted/10 transition-colors text-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* CONNECTION SUCCESS */}
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
                  Połączono z LinkedIn
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Zalogowano jako {profileName || "LinkedIn User"}.
                  {postCount
                    ? ` Pobrano ${postCount} postów z feeda.`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Config section */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Konfiguracja</h3>

            {/* Hashtags */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Hashtagi (opcjonalne filtrowanie)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="#AI, #tech..."
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddHashtag()}
                  className="flex-1 px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2]/20"
                />
                <button
                  onClick={handleAddHashtag}
                  disabled={!hashtagInput.trim()}
                  className="px-4 py-2.5 bg-muted/10 border border-border rounded-xl text-sm hover:bg-muted/20 disabled:opacity-50"
                >
                  +
                </button>
              </div>
              {config.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {config.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0A66C2]/10 text-[#0A66C2] rounded-full text-xs font-medium"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveHashtag(tag)}
                        className="hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Max posts */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Maksymalna liczba postów: {config.maxPosts}
              </label>
              <input
                type="range"
                min={10}
                max={50}
                value={config.maxPosts}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    maxPosts: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#0A66C2]"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10</span>
                <span>50</span>
              </div>
            </div>

            {/* Include reposts */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Udostępnione posty
                </p>
                <p className="text-xs text-muted-foreground">
                  Importuj reposty (udostępnienia)
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    includeReposts: !prev.includeReposts,
                  }))
                }
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  config.includeReposts
                    ? "bg-[#0A66C2]"
                    : "bg-muted/30 border border-border"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    config.includeReposts ? "right-1" : "left-1"
                  }`}
                />
              </button>
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
              className="flex-1 py-3.5 bg-[#0A66C2] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </>
      )}

      {/* Cancel */}
      {step !== "connected" &&
        step !== "authenticating" &&
        step !== "2fa" && (
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
