"use client";

import { useEffect, useState } from "react";
import { GmailWizard } from "@/components/connectors/GmailWizard";

export default function GmailIntegrationPage() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check if Gmail is connected
    fetch("/api/connectors/gmail/senders")
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(data.connected === true);
      })
      .catch(() => setIsConnected(false));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/connectors/gmail/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.error) {
        alert(data.error);
        setConnecting(false);
      }
    } catch {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-card pb-24 px-4 sm:px-6">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="py-3 flex items-center gap-3">
          <a href="/settings/integrations" className="text-primary">
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
          <h1 className="text-xl font-bold text-primary">
            Dodaj źródło Gmail
          </h1>
        </div>
      </header>

      <main className="p-4">
        {isConnected === null && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isConnected === false && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto bg-white dark:bg-white/95 border border-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12" viewBox="52 42 88 66" fill="none">
                  <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
                  <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
                  <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
                  <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92" />
                  <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                Połącz konto Gmail
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Autoryzuj dostęp do Gmail, żeby importować newslettery. Używamy
                wyłącznie uprawnień &quot;tylko do odczytu&quot;.
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3.5 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Łączenie...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.43l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Połącz z Google
                </>
              )}
            </button>

            <div className="bg-primary/10 rounded-xl p-3 flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <p className="text-xs text-primary">
                <span className="font-medium">Bezpieczeństwo:</span> OAuth 2.0
                z uprawnieniami readonly. Nie mamy dostępu do hasła. Możesz
                cofnąć dostęp w dowolnej chwili.
              </p>
            </div>
          </div>
        )}

        {isConnected === true && <GmailWizard />}
      </main>
    </div>
  );
}
