"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SourceWizard } from "@/components/sources/SourceWizard";

interface ScrapeStatus {
  sourceId: string;
  isLoading: boolean;
  message?: string;
  error?: string;
}

interface PrivateSource {
  id: string;
  name: string;
  url: string;
  type: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  articleCount: number;
  createdAt: string;
  config?: object | null;
}

interface CatalogSource {
  id: string;
  name: string;
  url: string;
  description: string | null;
  category: string | null;
  articleCount: number;
  isSubscribed: boolean;
  isHidden: boolean;
}

export default function SourcesSettingsPage() {
  const [privateSources, setPrivateSources] = useState<PrivateSource[]>([]);
  const [catalogSources, setCatalogSources] = useState<CatalogSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding new source
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Scraping state
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);

  // Wizard state
  const [wizardSource, setWizardSource] = useState<PrivateSource | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [privateRes, catalogRes] = await Promise.all([
        fetch("/api/sources/private"),
        fetch("/api/sources/catalog"),
      ]);

      if (!privateRes.ok || !catalogRes.ok) {
        throw new Error("Błąd pobierania źródeł");
      }

      const privateData = await privateRes.json();
      const catalogData = await catalogRes.json();

      setPrivateSources(privateData.sources || []);
      setCatalogSources(catalogData.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    setIsAdding(true);
    setAddError(null);

    try {
      const response = await fetch("/api/sources/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSourceName.trim(),
          url: newSourceUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd dodawania źródła");
      }

      // Add to list and reset form
      const newSource = { ...data.source, articleCount: 0, lastScrapedAt: null };
      setPrivateSources((prev) => [newSource, ...prev]);
      setNewSourceName("");
      setNewSourceUrl("");
      setShowAddForm(false);

      // Open wizard for new source
      setWizardSource(newSource);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsAdding(false);
    }
  };

  const handleTogglePrivateSource = async (sourceId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/sources/private/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) throw new Error("Błąd");

      setPrivateSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, isActive: !isActive } : s))
      );
    } catch (err) {
      console.error("Toggle source error:", err);
    }
  };

  const handleDeletePrivateSource = async (sourceId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to źródło? Artykuły z tego źródła również zostaną usunięte.")) {
      return;
    }

    try {
      const response = await fetch(`/api/sources/private/${sourceId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Błąd");

      setPrivateSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (err) {
      console.error("Delete source error:", err);
    }
  };

  const handleToggleCatalogSubscription = async (sourceId: string, isSubscribed: boolean) => {
    try {
      const response = await fetch("/api/sources/catalog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, subscribe: !isSubscribed }),
      });

      if (!response.ok) throw new Error("Błąd");

      setCatalogSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, isSubscribed: !isSubscribed } : s))
      );
    } catch (err) {
      console.error("Toggle subscription error:", err);
    }
  };

  const handleScrape = async (sourceId: string, sourceType: "private" | "catalog") => {
    setScrapeStatus({ sourceId, isLoading: true });

    try {
      const response = await fetch("/api/scrape/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, sourceType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setScrapeStatus({
          sourceId,
          isLoading: false,
          error: data.error || "Błąd scrapowania",
        });
        return;
      }

      setScrapeStatus({
        sourceId,
        isLoading: false,
        message: data.message,
      });

      // Update article count in local state
      if (sourceType === "private") {
        setPrivateSources((prev) =>
          prev.map((s) =>
            s.id === sourceId
              ? {
                  ...s,
                  articleCount: s.articleCount + (data.result?.articlesNew || 0),
                  lastScrapedAt: new Date().toISOString(),
                }
              : s
          )
        );
      } else {
        setCatalogSources((prev) =>
          prev.map((s) =>
            s.id === sourceId
              ? {
                  ...s,
                  articleCount: s.articleCount + (data.result?.articlesNew || 0),
                }
              : s
          )
        );
      }

      // Clear status after 5 seconds
      setTimeout(() => {
        setScrapeStatus(null);
      }, 5000);
    } catch (err) {
      setScrapeStatus({
        sourceId,
        isLoading: false,
        error: err instanceof Error ? err.message : "Błąd połączenia",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-card pb-24">
      {/* Header */}
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
          <h1 className="text-xl font-bold text-primary">Źródła</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-highlight">{error}</p>
            <Button onClick={fetchSources} variant="secondary" className="mt-4">
              Spróbuj ponownie
            </Button>
          </div>
        ) : (
          <>
            {/* Private Sources Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary">Moje źródła</h2>
                <Button
                  size="sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant={showAddForm ? "secondary" : "primary"}
                >
                  {showAddForm ? "Anuluj" : "+ Dodaj źródło"}
                </Button>
              </div>

              {/* Add Source Form */}
              {showAddForm && (
                <form onSubmit={handleAddSource} className="mb-4 p-4 bg-surface rounded-xl space-y-3">
                  <Input
                    label="Nazwa źródła"
                    placeholder="np. Mój ulubiony blog"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    required
                  />
                  <Input
                    label="URL strony"
                    type="url"
                    placeholder="https://example.com/blog"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    required
                  />
                  {addError && <p className="text-sm text-highlight">{addError}</p>}
                  <Button type="submit" isLoading={isAdding} className="w-full">
                    Dodaj źródło
                  </Button>
                </form>
              )}

              {/* Private Sources List */}
              {privateSources.length === 0 ? (
                <p className="text-muted text-center py-6 bg-surface rounded-xl">
                  Nie masz jeszcze własnych źródeł. Kliknij &quot;Dodaj źródło&quot; aby dodać pierwsze.
                </p>
              ) : (
                <div className="space-y-2">
                  {privateSources.map((source) => (
                    <div key={source.id} className="p-4 bg-surface rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-primary truncate">{source.name}</p>
                            {!source.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-border rounded-full text-muted">
                                Wyłączone
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted truncate">{source.url}</p>
                          <p className="text-xs text-muted mt-1">
                            {source.articleCount} artykułów
                            {source.lastScrapedAt && (
                              <> · Ostatni scraping: {new Date(source.lastScrapedAt).toLocaleDateString("pl-PL")}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {/* Configure Button */}
                          <button
                            onClick={() => setWizardSource(source)}
                            className="p-2 text-muted hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Konfiguruj sekcje"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          {/* Scrape Button */}
                          <button
                            onClick={() => handleScrape(source.id, "private")}
                            disabled={!source.isActive || scrapeStatus?.sourceId === source.id}
                            className={`p-2 rounded-lg transition-colors ${
                              scrapeStatus?.sourceId === source.id && scrapeStatus.isLoading
                                ? "bg-accent/20 text-accent"
                                : "text-muted hover:text-accent hover:bg-accent/10"
                            } disabled:opacity-50`}
                            title="Pobierz artykuły"
                          >
                            {scrapeStatus?.sourceId === source.id && scrapeStatus.isLoading ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                          </button>
                          {/* Toggle Active */}
                          <button
                            onClick={() => handleTogglePrivateSource(source.id, source.isActive)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              source.isActive ? "bg-accent" : "bg-border"
                            }`}
                            title={source.isActive ? "Wyłącz" : "Włącz"}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                source.isActive ? "left-6" : "left-1"
                              }`}
                            />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeletePrivateSource(source.id)}
                            className="p-2 text-muted hover:text-highlight transition-colors"
                            title="Usuń"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Scrape Status Message */}
                      {scrapeStatus?.sourceId === source.id && !scrapeStatus.isLoading && (
                        <div className={`mt-2 text-xs ${scrapeStatus.error ? "text-highlight" : "text-accent"}`}>
                          {scrapeStatus.error || scrapeStatus.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Catalog Sources Section */}
            <section>
              <h2 className="text-lg font-semibold text-primary mb-4">Katalog źródeł</h2>
              <p className="text-sm text-muted mb-4">
                Subskrybuj źródła z katalogu. Artykuły ze subskrybowanych źródeł pojawią się w Twoim feedzie.
              </p>

              {catalogSources.length === 0 ? (
                <p className="text-muted text-center py-6 bg-surface rounded-xl">
                  Brak źródeł w katalogu.
                </p>
              ) : (
                <div className="space-y-2">
                  {catalogSources.map((source) => (
                    <div key={source.id} className="p-4 bg-surface rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-primary truncate">{source.name}</p>
                            {source.category && (
                              <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                                {source.category}
                              </span>
                            )}
                          </div>
                          {source.description && (
                            <p className="text-sm text-muted line-clamp-1">{source.description}</p>
                          )}
                          <p className="text-xs text-muted mt-1">
                            {source.articleCount} artykułów
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {/* Scrape Button - only for subscribed sources */}
                          {source.isSubscribed && (
                            <button
                              onClick={() => handleScrape(source.id, "catalog")}
                              disabled={scrapeStatus?.sourceId === source.id}
                              className={`p-2 rounded-lg transition-colors ${
                                scrapeStatus?.sourceId === source.id && scrapeStatus.isLoading
                                  ? "bg-accent/20 text-accent"
                                  : "text-muted hover:text-accent hover:bg-accent/10"
                              } disabled:opacity-50`}
                              title="Pobierz artykuły"
                            >
                              {scrapeStatus?.sourceId === source.id && scrapeStatus.isLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              )}
                            </button>
                          )}
                          {/* Subscribe Button */}
                          <button
                            onClick={() => handleToggleCatalogSubscription(source.id, source.isSubscribed)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              source.isSubscribed
                                ? "bg-accent text-white"
                                : "bg-border text-primary hover:bg-border/80"
                            }`}
                          >
                            {source.isSubscribed ? "Subskrybujesz" : "Subskrybuj"}
                          </button>
                        </div>
                      </div>
                      {/* Scrape Status Message */}
                      {scrapeStatus?.sourceId === source.id && !scrapeStatus.isLoading && (
                        <div className={`mt-2 text-xs ${scrapeStatus.error ? "text-highlight" : "text-accent"}`}>
                          {scrapeStatus.error || scrapeStatus.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Source Configuration Wizard */}
      {wizardSource && (
        <SourceWizard
          isOpen={!!wizardSource}
          onClose={() => setWizardSource(null)}
          sourceId={wizardSource.id}
          sourceName={wizardSource.name}
          sourceUrl={wizardSource.url}
          onComplete={() => {
            setWizardSource(null);
            fetchSources();
          }}
        />
      )}
    </div>
  );
}
