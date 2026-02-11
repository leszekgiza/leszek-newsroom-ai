"use client";

import { ConnectorDashboard } from "@/components/connectors/ConnectorDashboard";

export default function IntegrationsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-card pb-24 px-4 sm:px-6">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="py-3 flex items-center gap-3">
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
          <h1 className="text-xl font-bold text-primary">Integracje</h1>
        </div>
      </header>

      <ConnectorDashboard />
    </div>
  );
}
