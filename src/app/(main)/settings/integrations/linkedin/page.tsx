"use client";

import { useEffect, useState } from "react";
import { LinkedInWizard } from "@/components/connectors/LinkedInWizard";

export default function LinkedInIntegrationPage() {
  const [status, setStatus] = useState<"loading" | "disconnected" | "connected">("loading");

  useEffect(() => {
    fetch("/api/connectors/linkedin/test", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.success ? "connected" : "disconnected");
      })
      .catch(() => setStatus("disconnected"));
  }, []);

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
          <h1 className="text-xl font-bold text-primary">Dodaj LinkedIn</h1>
        </div>
      </header>

      <main className="p-4">
        {status === "loading" && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {(status === "disconnected" || status === "connected") && (
          <LinkedInWizard />
        )}
      </main>
    </div>
  );
}
